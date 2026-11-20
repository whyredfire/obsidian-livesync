import { describe, expect, it, vi, afterEach } from "vitest";
import { EVENT_REQUEST_SHOW_SETUP_QR } from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import { createServiceContext } from "@vrtmrz/livesync-commonlib/context";
import { encodeSetupSettingsAsQR, useSetupQRCodeFeature } from "./qrCode";
import { encodeQR, encodeSettingsToQRCodeData } from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { copySetupURI } from "./setupUri";

vi.mock("./setupUri", () => ({ copySetupURI: vi.fn() }));
vi.mock("@/modules/features/SetupWizard/dialogs/ShowSetupQR.svelte", () => ({ default: "ShowSetupQR" }));

vi.mock("@vrtmrz/livesync-commonlib/compat/API/processSetting", () => {
    return {
        encodeQR: vi.fn(),
        encodeSettingsToQRCodeData: vi.fn(),
        OutputFormat: {
            SVG: "svg",
        },
    };
});

describe("setupObsidian/qrCode", () => {
    it("shows managed TURN settings and inactive profiles through the ordinary QR dialogue", async () => {
        const settings = {
            remoteConfigurations: {
                managed: { uri: "sls+p2p://room?managedType=CF&managedId=turn-key&token=private-token" },
            },
        };
        const openWithExplicitCancel = vi.fn(async () => "done");
        const host = {
            services: {
                API: { addLog: vi.fn() },
                context: createServiceContext(),
                setting: { currentSettings: () => settings },
                UI: { dialogManager: { openWithExplicitCancel } },
            },
        } as any;
        vi.mocked(encodeSettingsToQRCodeData).mockReturnValue("encoded-settings");
        vi.mocked(encodeQR).mockReturnValue("<svg/>");

        expect(await encodeSetupSettingsAsQR(host)).toBe("<svg/>");
        expect(encodeSettingsToQRCodeData).toHaveBeenCalledWith(settings);
        expect(openWithExplicitCancel).toHaveBeenCalledWith("ShowSetupQR", { parts: ["<svg/>"] });
        expect(copySetupURI).not.toHaveBeenCalled();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it("encodeSetupSettingsAsQR should return empty string when QR generation fails", async () => {
        const openWithExplicitCancel = vi.fn();
        const host = {
            services: {
                context: createServiceContext(),
                setting: {
                    currentSettings: vi.fn(() => ({ any: "settings" })),
                },
                UI: { dialogManager: { openWithExplicitCancel } },
            },
        } as any;

        vi.mocked(encodeSettingsToQRCodeData).mockReturnValue("encoded-settings");
        vi.mocked(encodeQR).mockReturnValue("");

        const result = await encodeSetupSettingsAsQR(host);

        expect(result).toBe("");
        expect(openWithExplicitCancel).not.toHaveBeenCalled();
    });

    it("encodeSetupSettingsAsQR passes every part of a split QR code to one dialogue", async () => {
        const openWithExplicitCancel = vi.fn(async () => "done");
        const host = {
            services: {
                context: createServiceContext(),
                setting: {
                    currentSettings: vi.fn(() => ({ any: "settings" })),
                },
                UI: { dialogManager: { openWithExplicitCancel } },
            },
        } as any;

        vi.mocked(encodeSettingsToQRCodeData).mockReturnValue("encoded-settings");
        vi.mocked(encodeQR).mockReturnValue({ total: 2, parts: ["<svg>1</svg>", "<svg>2</svg>"] } as any);

        const result = await encodeSetupSettingsAsQR(host);

        expect(result).toBe("<svg>1</svg>");
        expect(openWithExplicitCancel).toHaveBeenCalledExactlyOnceWith("ShowSetupQR", {
            parts: ["<svg>1</svg>", "<svg>2</svg>"],
        });
    });

    it("useSetupQRCodeFeature should register onLoaded handler that wires command and event", async () => {
        const addHandler = vi.fn();
        const addCommand = vi.fn();
        const context = createServiceContext();
        const onEventSpy = vi.spyOn(context.events, "onEvent");

        const host = {
            services: {
                context,
                API: {
                    addCommand,
                },
                appLifecycle: {
                    onLoaded: {
                        addHandler,
                    },
                },
                setting: {
                    currentSettings: vi.fn(() => ({ any: "settings" })),
                },
                UI: {
                    confirm: {
                        confirmWithMessage: vi.fn(),
                    },
                },
            },
        } as any;

        useSetupQRCodeFeature(host);
        expect(addHandler).toHaveBeenCalledTimes(1);

        const loadedHandler = addHandler.mock.calls[0][0] as () => Promise<boolean>;
        await loadedHandler();

        expect(addCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "livesync-setting-qr",
                name: "Show settings as a QR code",
            })
        );
        expect(onEventSpy).toHaveBeenCalledWith(EVENT_REQUEST_SHOW_SETUP_QR, expect.any(Function));
    });

    it("keeps the QR command out of the palette until setup is complete", async () => {
        const addHandler = vi.fn();
        const commands: Array<{
            id: string;
            checkCallback?: (checking: boolean) => boolean | void;
        }> = [];
        const settings = { isConfigured: false };
        const host = {
            services: {
                context: createServiceContext(),
                API: {
                    addCommand: vi.fn((command) => commands.push(command)),
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
                    confirm: {
                        confirmWithMessage: vi.fn(),
                    },
                },
            },
        } as any;

        useSetupQRCodeFeature(host);
        const loadedHandler = addHandler.mock.calls[0][0] as () => Promise<boolean>;
        await loadedHandler();

        const command = commands.find((candidate) => candidate.id === "livesync-setting-qr")!;
        expect(command.checkCallback?.(true)).toBe(false);

        settings.isConfigured = true;
        expect(command.checkCallback?.(true)).toBe(true);
    });
});
