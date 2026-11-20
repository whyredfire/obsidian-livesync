import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EVENT_REQUEST_COPY_SETUP_URI } from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import { createServiceContext } from "@vrtmrz/livesync-commonlib/context";
import {
    encodeTimeBoundSetupURI,
    getTimeBoundSetupURIUsableUntil,
    isTimeBoundSetupURIUsableNow,
} from "@vrtmrz/livesync-commonlib/setup-uri";
import { copySetupURI, createSetupURI, useSetupURIFeature } from "./setupUri";

vi.mock("@vrtmrz/livesync-commonlib/setup-uri", () => ({
    encodeTimeBoundSetupURI: vi.fn(),
    getTimeBoundSetupURIUsableUntil: vi.fn(),
    isTimeBoundSetupURIUsableNow: vi.fn(),
}));
vi.mock("@/modules/features/SetupWizard/dialogs/CopySetupURI.svelte", () => ({ default: "CopySetupURI" }));

describe("setupObsidian/setupUri", () => {
    const usableUntil = Date.parse("2026-10-01T00:00:00Z");
    const settings = { pluginSyncExtendedSetting: true, x: 1 } as any;

    beforeEach(() => {
        vi.mocked(getTimeBoundSetupURIUsableUntil).mockReturnValue(usableUntil);
        vi.mocked(encodeTimeBoundSetupURI).mockResolvedValue({ uri: "obsidian://setup-time-bound", usableUntil });
        vi.mocked(isTimeBoundSetupURIUsableNow).mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetAllMocks();
    });

    it("creates a time-bound link which expires at the end of the current window", async () => {
        const created = await createSetupURI(settings, "pass", true);

        expect(encodeTimeBoundSetupURI).toHaveBeenCalledWith(settings, "pass", {
            mode: "ephemeral",
            removeProperties: ["pluginSyncExtendedSetting"],
            skipDefaultValue: true,
        });
        expect(created.uri).toBe("obsidian://setup-time-bound");
        expect(created.expires).toEqual(expect.any(String));
    });

    it("creates a link without a time limit", async () => {
        vi.mocked(encodeTimeBoundSetupURI).mockResolvedValue({ uri: "compatible", usableUntil: null });

        await expect(createSetupURI(settings, "pass", false)).resolves.toEqual({ uri: "compatible", expires: null });
        expect(encodeTimeBoundSetupURI).toHaveBeenCalledWith(
            settings,
            "pass",
            expect.objectContaining({ mode: "persistent" })
        );
    });

    it("creates the link again if the window changes during creation", async () => {
        const nextUntil = usableUntil + 604_800_000;
        vi.mocked(getTimeBoundSetupURIUsableUntil).mockReturnValueOnce(usableUntil).mockReturnValueOnce(nextUntil);
        vi.mocked(encodeTimeBoundSetupURI)
            .mockRejectedValueOnce(new Error("Setup URI window changed during generation"))
            .mockResolvedValueOnce({ uri: "new-window", usableUntil: nextUntil });

        await expect(createSetupURI(settings, "pass", true)).resolves.toMatchObject({ uri: "new-window" });
        expect(encodeTimeBoundSetupURI).toHaveBeenCalledTimes(2);
    });

    it("does not return a link from an earlier window", async () => {
        const nextUntil = usableUntil + 604_800_000;
        vi.mocked(getTimeBoundSetupURIUsableUntil).mockReturnValueOnce(usableUntil).mockReturnValueOnce(nextUntil);
        vi.mocked(encodeTimeBoundSetupURI)
            .mockResolvedValueOnce({ uri: "old-window", usableUntil: nextUntil })
            .mockResolvedValueOnce({ uri: "new-window", usableUntil: nextUntil });

        await expect(createSetupURI(settings, "pass", true)).resolves.toMatchObject({ uri: "new-window" });
    });

    it("refuses a time-bound link when the clock is invalid", async () => {
        vi.mocked(getTimeBoundSetupURIUsableUntil).mockImplementation(() => {
            throw new Error("Invalid Setup URI clock");
        });

        await expect(createSetupURI(settings, "pass", true)).rejects.toThrow("clock is not valid");
        expect(encodeTimeBoundSetupURI).not.toHaveBeenCalled();
    });

    it("opens one dialogue which creates links from the current settings", async () => {
        const openWithExplicitCancel = vi.fn(async (_component: unknown, _data: any) => "done");
        const host = {
            services: {
                setting: { currentSettings: vi.fn(() => settings) },
                UI: { dialogManager: { openWithExplicitCancel } },
            },
        } as any;

        await copySetupURI(host);

        expect(openWithExplicitCancel).toHaveBeenCalledOnce();
        const [component, data] = openWithExplicitCancel.mock.calls[0];
        expect(component).toBe("CopySetupURI");
        expect(data.expires).toEqual(expect.any(String));
        await expect(data.create("pass", true)).resolves.toMatchObject({ uri: "obsidian://setup-time-bound" });
        expect(encodeTimeBoundSetupURI).toHaveBeenCalledWith(settings, "pass", expect.anything());
    });

    it("offers only links without a time limit when the clock is invalid", async () => {
        vi.mocked(getTimeBoundSetupURIUsableUntil).mockImplementation(() => {
            throw new Error("Invalid Setup URI clock");
        });
        const openWithExplicitCancel = vi.fn(async (_component: unknown, _data: any) => "cancelled");
        const host = {
            services: {
                setting: { currentSettings: vi.fn(() => settings) },
                UI: { dialogManager: { openWithExplicitCancel } },
            },
        } as any;

        await copySetupURI(host);

        expect(openWithExplicitCancel.mock.calls[0][1].expires).toBeNull();
    });

    it("useSetupURIFeature should register onLoaded handler that wires commands and event", async () => {
        const addHandler = vi.fn();
        const addCommand = vi.fn();
        const context = createServiceContext();
        const onEventSpy = vi.spyOn(context.events, "onEvent");

        const host = {
            services: {
                context,
                API: {
                    addCommand,
                    addLog: vi.fn(),
                },
                appLifecycle: {
                    onLoaded: {
                        addHandler,
                    },
                },
                setting: {
                    currentSettings: vi.fn(() => ({ x: 1 })),
                },
                UI: {
                    dialogManager: { openWithExplicitCancel: vi.fn(async () => "cancelled") },
                },
            },
        } as any;

        useSetupURIFeature(host);
        expect(addHandler).toHaveBeenCalledTimes(1);

        const loadedHandler = addHandler.mock.calls[0][0] as () => Promise<boolean>;
        await loadedHandler();

        expect(addCommand).toHaveBeenCalledTimes(1);
        expect(addCommand).toHaveBeenCalledWith(expect.objectContaining({ id: "livesync-copysetupuri" }));
        expect(onEventSpy).toHaveBeenCalledWith(EVENT_REQUEST_COPY_SETUP_URI, expect.any(Function));
    });

    it("offers the Setup URI command only once the device is configured", async () => {
        const addHandler = vi.fn();
        const commands: Array<{
            id: string;
            checkCallback?: (checking: boolean) => boolean | void;
        }> = [];
        const settings = {
            isConfigured: false,
            usePluginSync: false,
            useAdvancedMode: false,
        };
        const host = {
            services: {
                context: createServiceContext(),
                API: {
                    addCommand: vi.fn((command) => commands.push(command)),
                    addLog: vi.fn(),
                },
                appLifecycle: {
                    onLoaded: {
                        addHandler,
                    },
                },
                setting: {
                    currentSettings: vi.fn(() => settings),
                },
                UI: {
                    dialogManager: { openWithExplicitCancel: vi.fn(async () => "cancelled") },
                },
            },
        } as any;

        useSetupURIFeature(host);
        const loadedHandler = addHandler.mock.calls[0][0] as () => Promise<boolean>;
        await loadedHandler();

        const command = (id: string) => commands.find((candidate) => candidate.id === id)!;
        expect(command("livesync-copysetupuri").checkCallback?.(true)).toBe(false);

        settings.isConfigured = true;
        expect(command("livesync-copysetupuri").checkCallback?.(true)).toBe(true);
        expect(host.services.UI.dialogManager.openWithExplicitCancel).not.toHaveBeenCalled();
        settings.isConfigured = false;
        for (const registered of commands) expect(registered.checkCallback?.(false)).toBe(false);
        expect(host.services.UI.dialogManager.openWithExplicitCancel).not.toHaveBeenCalled();
        settings.isConfigured = true;
        for (const registered of commands) expect(registered.checkCallback?.(false)).toBe(true);
        expect(host.services.UI.dialogManager.openWithExplicitCancel).toHaveBeenCalledTimes(1);
    });
});
