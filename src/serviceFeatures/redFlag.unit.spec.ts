import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOG_LEVEL_URGENT } from "octagonal-wheels/common/logger";
import {
    FlagFilesHumanReadable,
    FlagFilesOriginal,
} from "@vrtmrz/livesync-commonlib/compat/common/models/redflag.const";
import { RemotePreferredTweakStatuses } from "@vrtmrz/livesync-commonlib/compat/common/models/tweak.definition";

const mocks = vi.hoisted(() => ({
    synchroniseAllFilesBetweenDBandStorage: vi.fn(async () => true),
    readPendingSetup: vi.fn(async (): Promise<"new" | "join" | undefined> => undefined),
    clearPendingSetup: vi.fn(async () => undefined),
}));

vi.mock("@vrtmrz/livesync-commonlib/compat/serviceFeatures/offlineScanner", () => ({
    ExtraOnLocal: { APPEND_STORAGE_ONLY: "append-storage-only" },
    FullScanModes: { NEWER_WINS: "newer-wins" },
    normaliseFullScanOptions: (options: unknown) => options,
    synchroniseAllFilesBetweenDBandStorage: mocks.synchroniseAllFilesBetweenDBandStorage,
}));
vi.mock("@vrtmrz/livesync-commonlib/compat/services/base/UnresolvedErrorManager", () => ({
    UnresolvedErrorManager: class {},
}));
vi.mock("./setupObsidian/pendingSetup", () => ({
    readPendingSetup: mocks.readPendingSetup,
    clearPendingSetup: mocks.clearPendingSetup,
}));

import { runScheduledInitialisation } from "./redFlag";
import { RED_SYNC_SYNC_TRIGGERS } from "@/common/core/settings/newVaultSettings";
import { DEFAULT_SETTINGS } from "@vrtmrz/livesync-commonlib/settings";

function createHost(flags: string[], remote: unknown = { status: RemotePreferredTweakStatuses.NOT_CONFIGURED }) {
    const files = new Set(flags);
    let settings: Record<string, unknown> = {
        ...DEFAULT_SETTINGS,
        suspendFileWatching: false,
        suspendParseReplicationResult: false,
    };
    const setting = {
        currentSettings: vi.fn(() => settings),
        applyPartial: vi.fn(async (partial: Record<string, unknown>) => {
            settings = { ...settings, ...partial };
        }),
        applyExternalSettings: vi.fn(async (next: Record<string, unknown>) => {
            settings = next;
        }),
        suspendAllSync: vi.fn(async () => undefined),
        suspendExtraSync: vi.fn(async () => undefined),
    };
    const storageAccess = {
        normalisePath: (path: string) => path,
        isExists: vi.fn(async (path: string) => files.has(path)),
        delete: vi.fn(async (path: string) => {
            files.delete(path);
        }),
    };
    const rebuilder = {
        $fetchLocalDBFast: vi.fn(async () => undefined),
        finishRebuild: vi.fn(async () => true),
        $rebuildEverything: vi.fn(async () => undefined),
    };
    const host = {
        services: {
            setting,
            tweakValue: { fetchRemotePreferred: vi.fn(async () => remote) },
            appLifecycle: {},
            context: { events: {} },
        },
        serviceModules: { storageAccess, rebuilder },
    } as never;
    return { host, files, setting, rebuilder, settings: () => settings };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.synchroniseAllFilesBetweenDBandStorage.mockResolvedValue(true);
    mocks.readPendingSetup.mockResolvedValue(undefined);
});

describe("scheduled Fetch and Rebuild", () => {
    it("does nothing when no operation is scheduled", async () => {
        const { host, rebuilder } = createHost([]);
        await expect(runScheduledInitialisation(host, vi.fn(), "fetch")).resolves.toBe(true);
        await expect(runScheduledInitialisation(host, vi.fn(), "rebuild")).resolves.toBe(true);
        expect(rebuilder.$fetchLocalDBFast).not.toHaveBeenCalled();
        expect(rebuilder.$rebuildEverything).not.toHaveBeenCalled();
    });

    it("downloads and merges without asking, then turns automatic sync on", async () => {
        const { host, files, rebuilder, settings } = createHost([FlagFilesHumanReadable.FETCH_ALL]);

        await expect(runScheduledInitialisation(host, vi.fn(), "fetch")).resolves.toBe(true);

        expect(rebuilder.$fetchLocalDBFast).toHaveBeenCalledOnce();
        expect(mocks.synchroniseAllFilesBetweenDBandStorage).toHaveBeenCalledWith(
            host,
            expect.any(Function),
            expect.anything(),
            expect.objectContaining({ mode: "newer-wins", extraOnLocal: "append-storage-only" })
        );
        expect(rebuilder.finishRebuild).toHaveBeenCalledOnce();
        expect(files.size).toBe(0);
        expect(settings()).toMatchObject({
            ...RED_SYNC_SYNC_TRIGGERS,
            suspendFileWatching: false,
            suspendParseReplicationResult: false,
        });
    });

    it("adopts the synchronisation settings stored in R2 before downloading", async () => {
        const { host, setting } = createHost([FlagFilesOriginal.FETCH_ALL], {
            status: RemotePreferredTweakStatuses.AVAILABLE,
            values: { customChunkSize: 99 },
        });
        await runScheduledInitialisation(host, vi.fn(), "fetch");
        expect(setting.applyExternalSettings).toHaveBeenCalledWith(
            expect.objectContaining({ customChunkSize: 99 }),
            true
        );
    });

    it("keeps the flag and tries again at the next start-up when R2 cannot be reached", async () => {
        const { host, files, rebuilder } = createHost([FlagFilesHumanReadable.FETCH_ALL], {
            status: RemotePreferredTweakStatuses.UNAVAILABLE,
            error: new Error("offline"),
        });
        const log = vi.fn();

        await expect(runScheduledInitialisation(host, log, "fetch")).resolves.toBe(false);

        expect(rebuilder.$fetchLocalDBFast).not.toHaveBeenCalled();
        expect(files.has(FlagFilesHumanReadable.FETCH_ALL)).toBe(true);
        expect(log).toHaveBeenCalledWith(expect.stringContaining("Could not reach"), LOG_LEVEL_URGENT);
    });

    it("keeps processing suspended and the flag in place when the download fails", async () => {
        const { host, files, rebuilder, settings } = createHost([FlagFilesHumanReadable.FETCH_ALL]);
        rebuilder.$fetchLocalDBFast.mockRejectedValueOnce(new Error("network"));

        await expect(runScheduledInitialisation(host, vi.fn(), "fetch")).resolves.toBe(false);

        expect(files.has(FlagFilesHumanReadable.FETCH_ALL)).toBe(true);
        expect(settings()).toMatchObject({ suspendFileWatching: true, suspendParseReplicationResult: true });
    });

    it("finishes a download even if some files could not be synchronised", async () => {
        const { host, files } = createHost([FlagFilesHumanReadable.FETCH_ALL]);
        mocks.synchroniseAllFilesBetweenDBandStorage.mockResolvedValueOnce(false);

        await expect(runScheduledInitialisation(host, vi.fn(), "fetch")).resolves.toBe(true);
        expect(files.size).toBe(0);
    });

    it("uploads this vault with this device's settings", async () => {
        const { host, files, rebuilder, setting, settings } = createHost([FlagFilesHumanReadable.REBUILD_ALL], {
            status: RemotePreferredTweakStatuses.AVAILABLE,
            values: { customChunkSize: 99 },
        });

        await expect(runScheduledInitialisation(host, vi.fn(), "rebuild")).resolves.toBe(true);

        expect(rebuilder.$rebuildEverything).toHaveBeenCalledOnce();
        expect(setting.applyExternalSettings).not.toHaveBeenCalled();
        expect(files.size).toBe(0);
        expect(settings()).toMatchObject(RED_SYNC_SYNC_TRIGGERS);
    });

    it("announces a setup started from the setup form once", async () => {
        mocks.readPendingSetup.mockResolvedValue("join");
        const { host } = createHost([FlagFilesHumanReadable.FETCH_ALL]);
        const log = vi.fn();

        await runScheduledInitialisation(host, log, "fetch");

        expect(mocks.clearPendingSetup).toHaveBeenCalledOnce();
        expect(log).toHaveBeenCalledWith(expect.stringContaining("Red Sync is ready"), LOG_LEVEL_URGENT);
    });
});
