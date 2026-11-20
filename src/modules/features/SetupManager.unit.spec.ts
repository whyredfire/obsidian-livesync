import { MemoryValueStore } from "@vrtmrz/value-store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    DEFAULT_SETTINGS,
    REMOTE_COUCHDB,
    REMOTE_MINIO,
    type ObsidianLiveSyncSettings,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { SettingService } from "@vrtmrz/livesync-commonlib/compat/services/base/SettingService";
import { ServiceContext } from "@vrtmrz/livesync-commonlib/context";
import { createNewVaultSettings } from "@/common/core/settings/newVaultSettings";

vi.mock("./SetupWizard/dialogs/SetupStart.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/SetupForm.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/UseSetupURI.svelte", () => ({ default: {} }));

vi.mock("@vrtmrz/livesync-commonlib/compat/API/processSetting", () => ({
    decodeSettingsFromQRCodeData: vi.fn(),
}));

import { decodeSettingsFromQRCodeData } from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { SetupManager } from "./SetupManager";

class TestSettingService extends SettingService<ServiceContext> {
    protected saveData(_setting: ObsidianLiveSyncSettings): Promise<void> {
        return Promise.resolve();
    }
    protected loadData(): Promise<ObsidianLiveSyncSettings | undefined> {
        return Promise.resolve(undefined);
    }
}

function createLegacyRemoteSetting(): ObsidianLiveSyncSettings {
    return {
        ...DEFAULT_SETTINGS,
        remoteConfigurations: {},
        activeConfigurationId: "",
        remoteType: REMOTE_MINIO,
        endpoint: "https://account.r2.cloudflarestorage.com",
        accessKey: "access",
        secretKey: "secret",
        bucket: "vault",
        region: "auto",
    };
}

function createSetupManager() {
    const setting = new TestSettingService(new ServiceContext(), {
        deviceValues: new MemoryValueStore(),
        APIService: {
            getSystemVaultName: vi.fn(() => "vault"),
            getAppID: vi.fn(() => "app"),
            confirm: {
                askString: vi.fn(() => Promise.resolve("")),
            },
            addLog: vi.fn(),
            addCommand: vi.fn(),
            registerWindow: vi.fn(),
            addRibbonIcon: vi.fn(),
            registerProtocolHandler: vi.fn(),
        } as any,
    });
    setting.settings = {
        ...DEFAULT_SETTINGS,
        remoteConfigurations: {},
        activeConfigurationId: "",
    };
    vi.spyOn(setting, "saveSettingData").mockResolvedValue();

    const dialogManager = {
        openWithExplicitCancel: vi.fn(),
        open: vi.fn(),
    };
    const services = {
        API: {
            addLog: vi.fn(),
            addCommand: vi.fn(),
            registerWindow: vi.fn(),
            addRibbonIcon: vi.fn(),
            registerProtocolHandler: vi.fn(),
        },
        UI: {
            dialogManager,
        },
        setting,
        vault: { vaultName: () => "vault" },
        replicator: {
            createRemoteResource: vi.fn(async () => ({
                inspectPathIdentity: vi.fn(async () => ({ status: "configured", pathNormalizationVersion: 0 })),
                dispose: vi.fn(async () => undefined),
            })),
        },
    } as any;
    const core: any = {
        _services: services,
        confirm: { confirmWithMessage: vi.fn() },
        rebuilder: {
            scheduleRebuild: vi.fn(async (prepareBeforeRestart?: () => Promise<void>) => {
                await prepareBeforeRestart?.();
                return true;
            }),
            scheduleFetch: vi.fn(async (prepareBeforeRestart?: () => Promise<void>) => {
                await prepareBeforeRestart?.();
                return true;
            }),
        },
    };
    Object.defineProperty(core, "services", {
        get() {
            return services;
        },
    });
    Object.defineProperty(core, "settings", {
        get() {
            return setting.settings;
        },
        set(value: ObsidianLiveSyncSettings) {
            setting.settings = value;
        },
    });

    const manager = new SetupManager(core);

    return {
        manager,
        setting,
        dialogManager,
        core,
    };
}

describe("setup URI and QR code", () => {
    it("rejects a Setup URI which does not contain an S3 connection", async () => {
        const { manager, dialogManager, core } = createSetupManager();
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce({
            ...createLegacyRemoteSetting(),
            remoteType: REMOTE_COUCHDB,
        });

        await expect(manager.onUseSetupURI()).resolves.toBe(false);
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
    });

    it.each([
        ["an unconfigured", false],
        ["an already configured", true],
    ])("downloads straight away when a Setup URI is used on %s device", async (_label, configured) => {
        const { manager, dialogManager, core, setting } = createSetupManager();
        setting.settings = { ...setting.currentSettings(), isConfigured: configured };
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(createLegacyRemoteSetting());

        await expect(manager.onUseSetupURI()).resolves.toBe(true);
        expect(dialogManager.openWithExplicitCancel).toHaveBeenCalledOnce();
        expect(core.rebuilder.scheduleFetch).toHaveBeenCalledOnce();
        expect(core.rebuilder.scheduleRebuild).not.toHaveBeenCalled();
        expect(setting.currentSettings()).toMatchObject({ remoteType: REMOTE_MINIO, isConfigured: true });
    });

    it("treats omitted identity fields in a Setup URI as legacy defaults", async () => {
        const { manager, dialogManager, setting } = createSetupManager();
        setting.settings = {
            ...setting.currentSettings(),
            pathNormalizationVersion: 1,
            idDerivationVersion: 1,
            idDerivationKey: "local-key",
        };
        const imported = createLegacyRemoteSetting() as Partial<ObsidianLiveSyncSettings>;
        delete imported.pathNormalizationVersion;
        delete imported.idDerivationVersion;
        delete imported.idDerivationKey;
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(imported);

        await manager.onUseSetupURI();

        expect(setting.currentSettings()).toMatchObject({
            pathNormalizationVersion: 0,
            idDerivationVersion: 0,
            idDerivationKey: "",
        });
    });

    it("downloads with settings from a QR code", async () => {
        const { manager, core, setting } = createSetupManager();
        vi.mocked(decodeSettingsFromQRCodeData).mockReturnValueOnce(createLegacyRemoteSetting());

        await expect(manager.decodeQR("qr")).resolves.toBe(true);
        expect(core.rebuilder.scheduleFetch).toHaveBeenCalledOnce();
        expect(setting.currentSettings()).toMatchObject({ bucket: "vault", isConfigured: true });
    });

    it("rejects invalid QR settings before applying them", async () => {
        const { manager, core } = createSetupManager();
        vi.mocked(decodeSettingsFromQRCodeData).mockImplementationOnce(() => {
            throw new Error("invalid");
        });

        await expect(manager.decodeQR("qr")).resolves.toBe(false);
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
    });
});

describe("changing the connection", () => {
    it("opens the setup form with the given values", async () => {
        const { manager, dialogManager } = createSetupManager();
        const values = {
            endpoint: "https://account.r2.cloudflarestorage.com",
            accessKey: "access",
            secretKey: "secret",
            bucket: "notes",
            bucketPrefix: "",
            sizeWarning: 100,
            encrypt: false,
            passphrase: "",
            usePathObfuscation: true,
        };
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("join").mockResolvedValueOnce("cancelled");

        await expect(manager.startOnBoarding(values)).resolves.toBe(false);

        expect(dialogManager.openWithExplicitCancel.mock.calls[1]?.[1]).toMatchObject({ mode: "join", values });
    });
});

describe("initial setup", () => {
    const formValues = {
        endpoint: "https://account.r2.cloudflarestorage.com",
        accessKey: "access",
        secretKey: "secret",
        bucket: "notes",
        bucketPrefix: "",
        sizeWarning: 0,
        encrypt: false,
        passphrase: "",
        usePathObfuscation: true,
    };

    function withBucket(status: "empty" | "configured", ok = true) {
        const fixture = createSetupManager();
        fixture.core.services.replicator.createRemoteResource.mockImplementation(async () => ({
            check: vi.fn(async () => ({ ok })),
            inspectPathIdentity: vi.fn(async () =>
                status === "empty" ? { status } : { status, pathNormalizationVersion: 0 }
            ),
            dispose: vi.fn(async () => undefined),
        }));
        return fixture;
    }

    it("refuses to join an empty bucket", async () => {
        const { manager } = withBucket("empty");
        const result = await manager.prepareSetup(createNewVaultSettings(), formValues, "join");
        expect(result).toMatchObject({ status: "error" });
        expect(result.status === "error" && result.message).toContain("no Red Sync data");
    });

    it("asks for a second confirmation before replacing a bucket which already has data", async () => {
        const { manager } = withBucket("configured");
        const result = await manager.prepareSetup(createNewVaultSettings(), formValues, "new");
        expect(result).toMatchObject({ status: "confirm", confirmLabel: "Replace and upload" });
    });

    it("adopts the bucket's path identity when joining", async () => {
        const { manager } = withBucket("configured");
        const result = await manager.prepareSetup(createNewVaultSettings(), formValues, "join");
        expect(result).toMatchObject({ status: "ok", settings: { pathNormalizationVersion: 0, bucket: "notes" } });
    });

    it("reports an unreachable bucket without applying anything", async () => {
        const { manager, core } = withBucket("empty", false);
        const result = await manager.prepareSetup(createNewVaultSettings(), formValues, "new");
        expect(result).toMatchObject({ status: "error" });
        expect(core.rebuilder.scheduleRebuild).not.toHaveBeenCalled();
    });

    it.each([
        ["new", "scheduleRebuild"],
        ["join", "scheduleFetch"],
    ] as const)("starts a %s sync without further confirmation", async (mode, scheduler) => {
        const { manager, core, setting } = createSetupManager();
        const settings = {
            ...createNewVaultSettings(),
            endpoint: "https://account.r2.cloudflarestorage.com",
            bucket: "notes",
        };
        await expect(manager.completeSetup(settings, mode)).resolves.toBe(true);
        expect(core.rebuilder[scheduler]).toHaveBeenCalledOnce();
        expect(core.confirm.confirmWithMessage).not.toHaveBeenCalled();
        expect(setting.currentSettings()).toMatchObject({ isConfigured: true, bucket: "notes" });
        await expect(setting.deviceValues.getValue("red-sync-pending-setup:vault")).resolves.toContain(`"${mode}"`);
    });

    it("returns to the start page from the form", async () => {
        const { manager, dialogManager } = createSetupManager();
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce("join")
            .mockResolvedValueOnce("back")
            .mockResolvedValueOnce("cancelled");
        await expect(manager.startOnBoarding()).resolves.toBe(false);
        expect(dialogManager.openWithExplicitCancel).toHaveBeenCalledTimes(3);
    });
});
