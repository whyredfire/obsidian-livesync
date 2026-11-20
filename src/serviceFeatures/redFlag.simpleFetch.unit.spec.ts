import { REMOTE_MINIO } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { describe, expect, it, vi } from "vitest";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { $msg } from "@/common/translation";
import { askSimpleFetchMode } from "./redFlag.simpleFetch";
import { DEFAULT_SETTINGS } from "@vrtmrz/livesync-commonlib/settings";
import { FlagFilesHumanReadable } from "@vrtmrz/livesync-commonlib/compat/common/models/redflag.const";
import { readFetchFlagState, writeFetchFlagState } from "./redFlag.fetchStateMarkdown";

vi.mock("./setupObsidian/pendingSetup", () => ({
    readPendingSetup: vi.fn(async () => undefined),
    clearPendingSetup: vi.fn(async () => undefined),
    markPendingSetup: vi.fn(async () => undefined),
}));

const REMOTE_WINS = "Overwrite all with remote files";
const KEEP_LOCAL = "Keep local files even if not on remote";

async function createHost(savedChoice?: string) {
    const smallConfig = new Map<string, string>();
    if (savedChoice) smallConfig.set("simple-fetch-mode", savedChoice);
    const config = {
        getValue: vi.fn(async (key: string, defaultValue = "") => smallConfig.get(key) ?? defaultValue),
        setValue: vi.fn(async (key: string, value: string) => {
            smallConfig.set(key, value);
        }),
        delete: vi.fn(async (key: string) => {
            smallConfig.delete(key);
        }),
    };
    const settings = {
        ...DEFAULT_SETTINGS,
        remoteType: REMOTE_MINIO,
        endpoint: "https://example.invalid",
        region: "auto",
        bucket: "vault",
    };
    const flagPath = FlagFilesHumanReadable.FETCH_ALL;
    const files = new Map<string, string>([[flagPath, ""]]);
    const storage = {
        normalisePath: (path: string) => path,
        isExists: vi.fn(async (path: string) => files.has(path)),
        readFileText: vi.fn(async (path: string) => files.get(path)!),
        writeFileAuto: vi.fn(async (path: string, text: string) => {
            files.set(path, text);
            return true;
        }),
    };
    const rememberedMarkdown = writeFetchFlagState("", {
        type: "livesync-fast-setup",
        version: 1,
        stage1: REMOTE_WINS,
        stage2: KEEP_LOCAL,
    });
    const confirmWithMessage =
        vi.fn<(title: string, message: string, buttons: string[], defaultAction: string) => Promise<string | false>>();
    const host = {
        services: {
            UI: { confirm: { confirmWithMessage } },
            setting: {
                config,
                currentSettings: () => settings,
            },
        },
        serviceModules: { storageAccess: storage },
    } as unknown as NecessaryServices<"UI" | "setting", "storageAccess">;
    return { host, confirmWithMessage, smallConfig, config, files, storage, flagPath, rememberedMarkdown, settings };
}

describe("Fast Setup translated choices", () => {
    it("waits for the saved choice before returning it to the fetch workflow", async () => {
        const { host, confirmWithMessage, files, flagPath, storage } = await createHost();
        let markSaveStarted!: () => void;
        const saveStarted = new Promise<void>((resolve) => {
            markSaveStarted = resolve;
        });
        let finishSave!: () => void;
        const save = new Promise<void>((resolve) => {
            finishSave = resolve;
        });
        storage.writeFileAuto.mockImplementation(async (key, value) => {
            markSaveStarted();
            await save;
            files.set(key, value);
            return true;
        });
        confirmWithMessage.mockImplementation(async (_title, _message, buttons) => buttons[1]);

        const asking = askSimpleFetchMode(host);
        await saveStarted;

        expect(files.get(flagPath)).toBe("");
        expect(confirmWithMessage).toHaveBeenCalledTimes(2);

        finishSave();
        await expect(asking).resolves.toMatchObject({ mode: "remote-only" });
        expect(readFetchFlagState(files.get(flagPath)!)).toMatchObject({
            stage1: REMOTE_WINS,
            stage2: KEEP_LOCAL,
        });
    });

    it("propagates a stored-choice read failure instead of treating it as missing", async () => {
        const { host, confirmWithMessage, storage } = await createHost();
        storage.readFileText.mockRejectedValueOnce(new Error("choice read failed"));

        await expect(askSimpleFetchMode(host)).rejects.toThrow("choice read failed");

        expect(confirmWithMessage).not.toHaveBeenCalled();
    });

    it("asks before proceeding with an invalid selection block and leaves it unchanged", async () => {
        const { host, confirmWithMessage, files, flagPath, storage } = await createHost();
        const markdown = '```json\n{"type":"livesync-fast-setup", broken}\n```\n';
        files.set(flagPath, markdown);
        confirmWithMessage.mockResolvedValueOnce(false);
        await expect(askSimpleFetchMode(host)).resolves.toBe("cancelled");
        expect(confirmWithMessage).toHaveBeenCalledOnce();
        expect(confirmWithMessage.mock.calls[0][0]).toBe("Saved fetch choices could not be read");
        expect(files.get(flagPath)).toBe(markdown);
        expect(storage.writeFileAuto).not.toHaveBeenCalled();
    });
});

describe("Fetch restart confirmation regressions", () => {
    it("requires explicit confirmation even when the saved selection is valid", async () => {
        const { host, files, flagPath, rememberedMarkdown, confirmWithMessage } = await createHost();
        files.set(flagPath, rememberedMarkdown);
        confirmWithMessage.mockResolvedValueOnce(false);
        await expect(askSimpleFetchMode(host)).resolves.toBe("cancelled");
        expect(confirmWithMessage).toHaveBeenCalledOnce();
        expect(confirmWithMessage.mock.calls[0][1]).toContain("example.invalid");
        expect(confirmWithMessage.mock.calls[0][1]).toContain(REMOTE_WINS);
        expect(confirmWithMessage.mock.calls[0][1]).toContain($msg(KEEP_LOCAL));
        expect(files.get(flagPath)).toBe(rememberedMarkdown);
    });

    it("uses new choices only for this attempt when the flag cannot be read as a selection", async () => {
        const { host, files, flagPath, confirmWithMessage, storage } = await createHost();
        const markdown = "# Recovery notes\n\n<!-- unfinished comment";
        files.set(flagPath, markdown);
        confirmWithMessage
            .mockImplementationOnce(async (_title, _message, buttons) => buttons[0])
            .mockResolvedValueOnce(REMOTE_WINS)
            .mockResolvedValueOnce(KEEP_LOCAL);
        await expect(askSimpleFetchMode(host)).resolves.toMatchObject({ mode: "remote-only" });
        expect(confirmWithMessage).toHaveBeenCalledTimes(3);
        expect(files.get(flagPath)).toBe(markdown);
        expect(storage.writeFileAuto).not.toHaveBeenCalled();
    });
});

describe("Fetch resume decisions", () => {
    it("replaces a valid saved choice only after choosing new options", async () => {
        const { host, files, flagPath, rememberedMarkdown, confirmWithMessage } = await createHost();
        files.set(flagPath, rememberedMarkdown);
        confirmWithMessage
            .mockResolvedValueOnce("Choose again")
            .mockResolvedValueOnce("Compare time and take newer")
            .mockResolvedValueOnce("Keep local files even if deleted on remote");
        await expect(askSimpleFetchMode(host)).resolves.toMatchObject({ mode: "newer-wins" });
        expect(confirmWithMessage).toHaveBeenCalledTimes(3);
        expect(readFetchFlagState(files.get(flagPath)!)).toMatchObject({
            stage1: "Compare time and take newer",
            stage2: "Keep local files even if deleted on remote",
        });
    });

    it("requires confirmation again after a successful explicit reuse", async () => {
        const { host, files, flagPath, rememberedMarkdown, confirmWithMessage } = await createHost();
        files.set(flagPath, rememberedMarkdown);
        confirmWithMessage.mockResolvedValueOnce("Continue with these choices").mockResolvedValueOnce(false);
        await expect(askSimpleFetchMode(host)).resolves.toMatchObject({ mode: "remote-only" });
        await expect(askSimpleFetchMode(host)).resolves.toBe("cancelled");
        expect(confirmWithMessage).toHaveBeenCalledTimes(2);
        expect(confirmWithMessage.mock.calls[0][3]).toBe("Cancel");
    });
});
