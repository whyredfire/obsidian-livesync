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
vi.mock("./SetupWizard/dialogs/OutroNewUser.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/OutroExistingUser.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/OutroAskUserMode.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/ApplySettingsInitialisation.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/SetupRemote.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/SetupRemoteCouchDB.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/SetupRemoteBucket.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/SetupRemoteP2P.svelte", () => ({ default: {} }));
vi.mock("./SetupWizard/dialogs/SetupRemoteE2EE.svelte", () => ({ default: {} }));

vi.mock("@vrtmrz/livesync-commonlib/compat/API/processSetting", () => ({
    decodeSettingsFromQRCodeData: vi.fn(),
}));

import { decodeSettingsFromQRCodeData } from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { SetupManager, UserMode } from "./SetupManager";

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

describe("SetupManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it.each([REMOTE_MINIO])(
        "uses an existing remote declaration during first manual setup for %s",
        async (remoteType) => {
            const { manager, core, dialogManager } = createSetupManager();
            const dispose = vi.fn(async () => undefined);
            core.services.replicator.createRemoteResource.mockResolvedValue({
                inspectPathIdentity: vi.fn(async () => ({ status: "configured", pathNormalizationVersion: 0 })),
                dispose,
            });
            const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);
            dialogManager.openWithExplicitCancel.mockResolvedValue({
                couchDB_URI: "https://example.test",
                couchDB_DBNAME: "vault",
                couchDB_USER: "user",
                couchDB_PASSWORD: "pass",
                endpoint: "https://objects.test",
                bucket: "vault",
                accessKey: "key",
                secretKey: "secret",
                region: "auto",
                bucketPrefix: "",
            });
            const initial = { ...createLegacyRemoteSetting(), pathNormalizationVersion: 1 } as ObsidianLiveSyncSettings;
            await manager.onBucketManualSetup(UserMode.NewUser, initial);
            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({ pathNormalizationVersion: 0 }),
                UserMode.NewUser,
                true
            );
            expect(dispose).toHaveBeenCalledOnce();
            expect(initial.pathNormalizationVersion).toBe(1);
        }
    );

    it.each([
        [{ status: "empty" }, 1],
        [{ status: "configured", pathNormalizationVersion: 1 }, 1],
    ] as const)("uses inspected setup identity %s", async (inspection, expected) => {
        const { manager, core, dialogManager } = createSetupManager();
        core.services.replicator.createRemoteResource.mockResolvedValue({
            inspectPathIdentity: vi.fn(async () => inspection),
            dispose: vi.fn(async () => undefined),
        });
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);
        dialogManager.openWithExplicitCancel.mockResolvedValue({
            endpoint: "https://example.test",
            bucket: "vault",
        });
        await manager.onBucketManualSetup(UserMode.NewUser, createNewVaultSettings());
        expect(confirm).toHaveBeenCalledWith(
            expect.objectContaining({ pathNormalizationVersion: expected }),
            UserMode.NewUser,
            true
        );
    });

    it.each([
        [UserMode.Update, true],
        [UserMode.NewUser, false],
    ] as const)("keeps identity during profile edits in mode %s with activation %s", async (mode, activate) => {
        const { manager, core, dialogManager } = createSetupManager();
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);
        dialogManager.openWithExplicitCancel.mockResolvedValue({
            endpoint: "https://example.test",
            bucket: "vault",
        });
        await manager.onBucketManualSetup(mode, createLegacyRemoteSetting(), activate);
        expect(core.services.replicator.createRemoteResource).not.toHaveBeenCalled();
        expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ pathNormalizationVersion: 0 }), mode, activate);
    });

    it("compatibility: normalises imported flat remote settings from a Setup URI before applying", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce(createLegacyRemoteSetting())
            .mockResolvedValueOnce("compatible-existing-user");

        const result = await manager.onUseSetupURI(UserMode.Unknown, "mock-config://settings");

        expect(result).toBe(true);
        const activeId = setting.currentSettings().activeConfigurationId;
        expect(activeId).toMatch(/^legacy-/);
        expect(setting.currentSettings().remoteConfigurations[activeId]?.uri).toMatch(/^sls\+s3:\/\//);
    });

    it("compatibility: treats omitted identity fields in a Setup URI as legacy defaults", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        const savedKey = "12".repeat(32);
        setting.settings = {
            ...createLegacyRemoteSetting(),
            isConfigured: true,
            pathNormalizationVersion: 1,
            idDerivationVersion: 1,
            idDerivationKey: savedKey,
            acceptUnencryptedContent: true,
        } as ObsidianLiveSyncSettings;
        const imported = {
            ...createLegacyRemoteSetting(),
            isConfigured: true,
        } as Partial<ObsidianLiveSyncSettings>;
        delete imported.pathNormalizationVersion;
        delete imported.idDerivationVersion;
        delete imported.idDerivationKey;
        vi.spyOn(setting, "adjustSettings").mockImplementation((settings) => Promise.resolve(settings));
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(imported).mockResolvedValueOnce("cancelled");

        await manager.onUseSetupURI(UserMode.Unknown, "mock-config://legacy-settings");

        const mergedSettings = vi.mocked(setting.adjustSettings).mock.calls[0][0];
        expect(mergedSettings.pathNormalizationVersion).toBe(0);
        expect(mergedSettings.idDerivationVersion).toBe(0);
        expect(mergedSettings.idDerivationKey).toBe("");
        expect((mergedSettings as any).acceptUnencryptedContent).toBe(false);
        expect(setting.currentSettings().idDerivationKey).toBe(savedKey);
    });

    it("does not inherit the missing half of a partially present Setup URI ID configuration", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        const savedKey = "34".repeat(32);
        setting.settings = {
            ...createLegacyRemoteSetting(),
            isConfigured: true,
            idDerivationVersion: 1,
            idDerivationKey: savedKey,
            acceptUnencryptedContent: true,
        } as ObsidianLiveSyncSettings;
        const imported = {
            ...createLegacyRemoteSetting(),
            isConfigured: true,
            idDerivationVersion: 1,
        } as Partial<ObsidianLiveSyncSettings>;
        delete imported.idDerivationKey;
        vi.spyOn(setting, "adjustSettings").mockImplementation((settings) => Promise.resolve(settings));
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(imported).mockResolvedValueOnce("cancelled");

        await manager.onUseSetupURI(UserMode.Unknown, "mock-config://partial-settings");

        const mergedSettings = vi.mocked(setting.adjustSettings).mock.calls[0][0];
        expect(mergedSettings.idDerivationVersion).toBe(1);
        expect(mergedSettings.idDerivationKey).toBe("");
        expect(setting.currentSettings().idDerivationKey).toBe(savedKey);
    });

    it("compatibility: normalises imported flat remote settings from QR data before applying", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        vi.mocked(decodeSettingsFromQRCodeData).mockReturnValue(createLegacyRemoteSetting());
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("compatible-existing-user");

        const result = await manager.decodeQR("qr-data");

        expect(result).toBe(true);
        expect(decodeSettingsFromQRCodeData).toHaveBeenCalledWith("qr-data");
        const activeId = setting.currentSettings().activeConfigurationId;
        expect(activeId).toMatch(/^legacy-/);
        expect(setting.currentSettings().remoteConfigurations[activeId]?.uri).toMatch(/^sls\+s3:\/\//);
    });

    it("compatibility: applies legacy defaults when QR data omits ID derivation fields", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        const savedKey = "56".repeat(32);
        setting.settings = {
            ...createLegacyRemoteSetting(),
            isConfigured: true,
            idDerivationVersion: 1,
            idDerivationKey: savedKey,
        };
        const imported = { ...createLegacyRemoteSetting(), isConfigured: true } as Partial<ObsidianLiveSyncSettings>;
        delete imported.idDerivationVersion;
        delete imported.idDerivationKey;
        vi.mocked(decodeSettingsFromQRCodeData).mockReturnValue(imported as ObsidianLiveSyncSettings);
        vi.spyOn(setting, "adjustSettings").mockImplementation((settings) => Promise.resolve(settings));
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("cancelled");

        await manager.decodeQR("qr-data");

        const mergedSettings = vi.mocked(setting.adjustSettings).mock.calls[0][0];
        expect(mergedSettings.idDerivationVersion).toBe(0);
        expect(mergedSettings.idDerivationKey).toBe("");
        expect((mergedSettings as any).acceptUnencryptedContent).toBe(false);
        expect(setting.currentSettings().idDerivationKey).toBe(savedKey);
    });

    it("normalises a malformed plaintext receipt value in a Setup URI to false", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        setting.settings = Object.assign(createLegacyRemoteSetting(), { acceptUnencryptedContent: true });
        const imported = Object.assign(createLegacyRemoteSetting(), { acceptUnencryptedContent: "true" });
        vi.spyOn(setting, "adjustSettings").mockImplementation((settings) => Promise.resolve(settings));
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(imported).mockResolvedValueOnce("cancelled");

        await manager.onUseSetupURI(UserMode.Unknown, "mock-config://invalid-plaintext-policy");

        expect((vi.mocked(setting.adjustSettings).mock.calls[0]![0] as any).acceptUnencryptedContent).toBe(false);
    });

    it.each(["setup-uri", "qr"] as const)("preserves an explicit plaintext receipt choice from %s", async (source) => {
        const { manager, setting, dialogManager } = createSetupManager();
        const imported = Object.assign(createLegacyRemoteSetting(), { acceptUnencryptedContent: true });
        vi.spyOn(setting, "adjustSettings").mockImplementation((settings) => Promise.resolve(settings));
        if (source === "setup-uri") {
            dialogManager.openWithExplicitCancel.mockResolvedValueOnce(imported).mockResolvedValueOnce("cancelled");
            await manager.onUseSetupURI(UserMode.Unknown, "mock-config://enabled-plaintext-policy");
        } else {
            vi.mocked(decodeSettingsFromQRCodeData).mockReturnValue(imported);
            dialogManager.openWithExplicitCancel.mockResolvedValueOnce("cancelled");
            await manager.decodeQR("qr-data");
        }

        expect((vi.mocked(setting.adjustSettings).mock.calls[0]![0] as any).acceptUnencryptedContent).toBe(true);
    });

    it("warns in the existing application confirmation when an import enables plaintext receipt", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        setting.settings = Object.assign(setting.currentSettings(), {
            encrypt: true,
            acceptUnencryptedContent: false,
        });
        const imported = { ...setting.currentSettings(), acceptUnencryptedContent: true };
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("cancelled");

        await expect(manager.onConfirmApplySettingsFromWizard(imported, UserMode.ExistingUser)).resolves.toBe(false);

        expect(dialogManager.openWithExplicitCancel).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ enableUnencryptedContent: true })
        );
    });

    it("applies a preference-only import to an existing vault without Fetch or Rebuild", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        setting.settings = Object.assign(setting.currentSettings(), {
            isConfigured: true,
            encrypt: true,
            acceptUnencryptedContent: false,
        });
        const imported = { ...setting.currentSettings(), acceptUnencryptedContent: true };
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("compatible-existing-user");

        await expect(manager.onConfirmApplySettingsFromWizard(imported, UserMode.Unknown)).resolves.toBe(true);

        expect((setting.currentSettings() as any).acceptUnencryptedContent).toBe(true);
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleRebuild).not.toHaveBeenCalled();
    });

    it("passes the warning through the mode choice before a compatible or new-user application", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        setting.settings = Object.assign(setting.currentSettings(), {
            encrypt: true,
            acceptUnencryptedContent: false,
        });
        const imported = {
            ...setting.currentSettings(),
            couchDB_DBNAME: "imported-vault",
            acceptUnencryptedContent: true,
        };
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("new-user").mockResolvedValueOnce("cancelled");

        await expect(manager.onConfirmApplySettingsFromWizard(imported, UserMode.Unknown)).resolves.toBe(false);

        expect(dialogManager.openWithExplicitCancel).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            expect.objectContaining({ enableUnencryptedContent: true })
        );
        expect(dialogManager.openWithExplicitCancel).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            expect.objectContaining({ enableUnencryptedContent: true })
        );
    });

    it("rejects invalid QR settings before applying them", async () => {
        const { manager, setting } = createSetupManager();
        vi.mocked(decodeSettingsFromQRCodeData).mockImplementationOnce(() => {
            throw new Error("Invalid ID derivation key");
        });
        const applyExternalSettings = vi.spyOn(setting, "applyExternalSettings");

        await expect(manager.decodeQR("invalid-qr")).resolves.toBe(false);
        expect(applyExternalSettings).not.toHaveBeenCalled();
    });

    it("requires the normal Fetch choice when ID derivation changes with the Metadata preference", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        const currentSettings: ObsidianLiveSyncSettings = {
            ...createLegacyRemoteSetting(),
            isConfigured: true,
            encrypt: true,
            passphrase: "e2ee-passphrase",
            usePathObfuscation: true,
            encryptInternalMetadata: false,
            idDerivationVersion: 0,
            idDerivationKey: "",
        };
        const nextIdKey = "78".repeat(32);
        setting.settings = currentSettings;
        const applyPartial = vi.spyOn(setting, "applyPartial");
        core.confirm.askSelectStringDialogue = vi.fn(() =>
            Promise.resolve("Enable without rebuilding — update every other device first")
        );
        core.confirm.confirmWithMessage.mockResolvedValueOnce("Restart and Fetch Data");
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce({
                ...currentSettings,
                encryptInternalMetadata: true,
                idDerivationVersion: 1,
                idDerivationKey: nextIdKey,
            })
            .mockResolvedValueOnce("existing-user")
            .mockResolvedValueOnce("apply");

        await manager.onlyE2EEConfiguration(UserMode.Update, currentSettings);

        expect(applyPartial).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleFetch).toHaveBeenCalledWith(expect.any(Function));
        expect(setting.currentSettings().idDerivationVersion).toBe(1);
        expect(setting.currentSettings().idDerivationKey).toBe(nextIdKey);
    });

    it("reserves Rebuild before saving a new-user configuration", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        setting.settings = { ...setting.currentSettings(), isConfigured: false };
        const applyExternalSettings = vi.spyOn(setting, "applyExternalSettings");
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(true);

        await manager.onConfirmApplySettingsFromWizard(
            { ...createLegacyRemoteSetting(), isConfigured: true },
            UserMode.NewUser
        );

        expect(core.rebuilder.scheduleRebuild).toHaveBeenCalledWith(expect.any(Function));
        expect(core.rebuilder.scheduleRebuild.mock.invocationCallOrder[0]).toBeLessThan(
            applyExternalSettings.mock.invocationCallOrder[0]
        );
        expect(setting.currentSettings().isConfigured).toBe(true);
    });

    it.each([
        {
            name: "CouchDB",
            remoteType: REMOTE_COUCHDB,
            restart: "Restart and Fetch Data",
            settingsPage: "Automatic sync",
        },
        {
            name: "Object Storage",
            remoteType: REMOTE_MINIO,
            restart: "Restart and Fetch Data",
            settingsPage: "Automatic sync",
        },
    ])(
        "waits for the restart confirmation before reserving Fetch for $name",
        async ({ remoteType, restart, settingsPage }) => {
            const { manager, setting, dialogManager, core } = createSetupManager();
            const applyExternalSettings = vi.spyOn(setting, "applyExternalSettings");
            const extra = vi.fn();
            dialogManager.openWithExplicitCancel.mockResolvedValueOnce("apply");
            core.confirm.confirmWithMessage.mockImplementationOnce(async () => {
                expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
                expect(applyExternalSettings).not.toHaveBeenCalled();
                expect(extra).not.toHaveBeenCalled();
                return restart;
            });

            await manager.onConfirmApplySettingsFromWizard(
                { ...createLegacyRemoteSetting(), isConfigured: true, remoteType },
                UserMode.ExistingUser,
                true,
                extra
            );

            expect(core.confirm.confirmWithMessage).toHaveBeenCalledExactlyOnceWith(
                "Before restarting",
                expect.stringContaining(settingsPage),
                [restart, "Cancel"],
                restart
            );
            expect(core.rebuilder.scheduleFetch).toHaveBeenCalledOnce();
            expect(applyExternalSettings).toHaveBeenCalledOnce();
            expect(extra).toHaveBeenCalledOnce();
        }
    );

    it.each(["Cancel", false])(
        "leaves settings and Fetch alone when the restart dialogue returns %s",
        async (action) => {
            const { manager, setting, dialogManager, core } = createSetupManager();
            const applyExternalSettings = vi.spyOn(setting, "applyExternalSettings");
            const extra = vi.fn();
            dialogManager.openWithExplicitCancel.mockResolvedValueOnce("apply");
            core.confirm.confirmWithMessage.mockResolvedValueOnce(action);

            await expect(
                manager.onConfirmApplySettingsFromWizard(
                    { ...createLegacyRemoteSetting(), isConfigured: true },
                    UserMode.ExistingUser,
                    true,
                    extra
                )
            ).resolves.toBe(false);

            expect(dialogManager.openWithExplicitCancel).toHaveBeenCalledOnce();
            expect(core.confirm.confirmWithMessage).toHaveBeenCalledOnce();
            expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
            expect(applyExternalSettings).not.toHaveBeenCalled();
            expect(extra).not.toHaveBeenCalled();
        }
    );

    it("does not add a migrated remote profile to the current settings when cancelling a legacy Setup URI", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        const before = structuredClone(setting.currentSettings());
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce({
                isConfigured: true,
                remoteType: REMOTE_COUCHDB,
                couchDB_URI: "http://localhost:5984",
            })
            .mockResolvedValueOnce("apply");
        core.confirm.confirmWithMessage.mockResolvedValueOnce("Cancel");

        await expect(manager.onUseSetupURI(UserMode.ExistingUser, "mock-config://settings")).resolves.toBe(false);

        expect(setting.currentSettings()).toEqual(before);
        expect(setting.saveSettingData).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
    });

    it("reserves Fetch when compatible imported settings activate an unconfigured device", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        setting.settings = { ...setting.currentSettings(), isConfigured: false };
        const applyExternalSettings = vi.spyOn(setting, "applyExternalSettings");
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce({ ...createLegacyRemoteSetting(), isConfigured: true })
            .mockResolvedValueOnce("compatible-existing-user");

        await manager.onUseSetupURI(UserMode.Unknown, "mock-config://settings");

        expect(core.rebuilder.scheduleFetch).toHaveBeenCalledWith(expect.any(Function));
        expect(core.rebuilder.scheduleFetch.mock.invocationCallOrder[0]).toBeLessThan(
            applyExternalSettings.mock.invocationCallOrder[0]
        );
        expect(setting.currentSettings().isConfigured).toBe(true);
    });

    it("applies compatible settings to an already configured device without scheduling Fetch", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        setting.settings = { ...setting.currentSettings(), isConfigured: true };
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce({ ...createLegacyRemoteSetting(), isConfigured: true })
            .mockResolvedValueOnce("compatible-existing-user");

        await manager.onUseSetupURI(UserMode.Unknown, "mock-config://settings");

        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
        expect(setting.currentSettings().isConfigured).toBe(true);
    });

    it("does not enable imported settings when the initialisation flag cannot be reserved", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        setting.settings = { ...setting.currentSettings(), isConfigured: false };
        const applyExternalSettings = vi.spyOn(setting, "applyExternalSettings");
        core.rebuilder.scheduleRebuild.mockResolvedValueOnce(false);
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(true);

        await manager.onConfirmApplySettingsFromWizard(
            { ...createLegacyRemoteSetting(), isConfigured: true },
            UserMode.NewUser
        );

        expect(core.rebuilder.scheduleRebuild).toHaveBeenCalledWith(expect.any(Function));
        expect(applyExternalSettings).not.toHaveBeenCalled();
        expect(setting.currentSettings().isConfigured).toBe(false);
    });

    it("reports cancellation separately when applying settings which require initialisation", async () => {
        const { manager, dialogManager, core } = createSetupManager();
        const applySettings = vi.fn(async () => undefined);
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("cancelled");

        const result = await manager.applySettingsWithInitialisationChoice({ applySettings });

        expect(result).toEqual({ result: "cancelled" });
        expect(dialogManager.openWithExplicitCancel).toHaveBeenCalledWith(expect.anything());
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleRebuild).not.toHaveBeenCalled();
        expect(applySettings).not.toHaveBeenCalled();
    });

    it("reserves the selected initialisation before applying pending settings", async () => {
        const { manager, dialogManager, core } = createSetupManager();
        const applySettings = vi.fn(async () => undefined);
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("fetch");

        const result = await manager.applySettingsWithInitialisationChoice({ applySettings });

        expect(result).toEqual({ result: "scheduled", mode: "fetch" });
        expect(core.rebuilder.scheduleFetch).toHaveBeenCalledWith(expect.any(Function));
        expect(core.rebuilder.scheduleFetch.mock.invocationCallOrder[0]).toBeLessThan(
            applySettings.mock.invocationCallOrder[0]
        );
    });

    it("reports a failed reservation without applying pending settings", async () => {
        const { manager, dialogManager, core } = createSetupManager();
        const applySettings = vi.fn(async () => undefined);
        core.rebuilder.scheduleRebuild.mockResolvedValueOnce(false);
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("rebuild");

        const result = await manager.applySettingsWithInitialisationChoice({ applySettings });

        expect(result).toEqual({ result: "failed", mode: "rebuild" });
        expect(applySettings).not.toHaveBeenCalled();
    });

    it("does not reserve initialisation when the selected source cannot be validated", async () => {
        const { manager, dialogManager, core } = createSetupManager();
        const applySettings = vi.fn(async () => undefined);
        const validateChoice = vi.fn(async () => false);
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce("fetch");

        const result = await manager.applySettingsWithInitialisationChoice({
            applySettings,
            validateChoice,
        });

        expect(result).toEqual({ result: "failed", mode: "fetch" });
        expect(validateChoice).toHaveBeenCalledWith("fetch");
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
        expect(applySettings).not.toHaveBeenCalled();
    });

    it.each([
        { importedSize: 0, expectedSize: 0 },
        { importedSize: undefined, expectedSize: 60 },
    ])(
        "preserves modern Setup URI profiles and adopts the supplied chunk size $importedSize",
        async ({ importedSize, expectedSize }) => {
            const { manager, setting, dialogManager } = createSetupManager();
            setting.settings = {
                ...setting.currentSettings(),
                customChunkSize: 60,
            };
            const imported = {
                ...DEFAULT_SETTINGS,
                remoteConfigurations: {
                    couch: {
                        id: "couch",
                        name: "Office CouchDB",
                        uri: "sls+https://alice:secret@couch.example/?db=notes",
                        isEncrypted: false,
                    },
                    archive: {
                        id: "archive",
                        name: "Archive bucket",
                        uri: "sls+s3://key:secret@storage.example/?endpoint=https%3A%2F%2Fstorage.example&bucket=archive&region=auto",
                        isEncrypted: false,
                    },
                },
                activeConfigurationId: "archive",
            } as ObsidianLiveSyncSettings;
            if (importedSize === undefined) delete (imported as Partial<ObsidianLiveSyncSettings>).customChunkSize;
            else imported.customChunkSize = importedSize;
            dialogManager.openWithExplicitCancel
                .mockResolvedValueOnce(imported)
                .mockResolvedValueOnce("compatible-existing-user");

            await manager.onUseSetupURI(UserMode.Unknown, "mock-config://modern-settings");

            const current = setting.currentSettings();
            expect(current.customChunkSize).toBe(expectedSize);
            expect(current.remoteConfigurations).toEqual(imported.remoteConfigurations);
            expect(current.activeConfigurationId).toBe("archive");
            expect(Object.keys(current.remoteConfigurations).some((id) => id.startsWith("legacy-"))).toBe(false);
        }
    );

    it("adds and activates a manually configured Object Storage profile without replacing existing profiles", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        setting.settings = {
            ...setting.currentSettings(),
            isConfigured: true,
            remoteConfigurations: {
                existing: {
                    id: "existing",
                    name: "Existing remote",
                    uri: "sls+http://old:secret@old.example/?db=old",
                    isEncrypted: false,
                },
            },
            activeConfigurationId: "existing",
        };
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce({
                endpoint: "https://storage.example",
                accessKey: "key",
                secretKey: "secret",
                bucket: "notes",
                region: "auto",
                bucketPrefix: "",
                useCustomRequestHandler: false,
                bucketCustomHeaders: "",
                forcePathStyle: true,
            })
            .mockResolvedValueOnce("apply");
        core.confirm.confirmWithMessage.mockResolvedValueOnce("Restart and Fetch Data");

        await manager.onBucketManualSetup(UserMode.ExistingUser, setting.currentSettings());

        const current = setting.currentSettings();
        expect(current.remoteConfigurations.existing).toBeDefined();
        expect(Object.keys(current.remoteConfigurations)).toHaveLength(2);
        expect(current.activeConfigurationId).not.toBe("existing");
        const activeProfile = current.remoteConfigurations[current.activeConfigurationId];
        expect(activeProfile?.name).toBe("S3 notes");
        expect(activeProfile?.uri).toContain("sls+s3://key:secret@storage.example");
    });

    it("does not register Object Storage when final confirmation is cancelled", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        setting.settings = {
            ...setting.currentSettings(),
            isConfigured: true,
            remoteConfigurations: {
                existing: {
                    id: "existing",
                    name: "Existing remote",
                    uri: "sls+http://old:secret@old.example/?db=old",
                    isEncrypted: false,
                },
            },
            activeConfigurationId: "existing",
        };
        const before = structuredClone(setting.currentSettings().remoteConfigurations);
        dialogManager.openWithExplicitCancel
            .mockResolvedValueOnce({
                endpoint: "https://storage.example",
                accessKey: "key",
                secretKey: "secret",
                bucket: "notes",
                region: "auto",
                bucketPrefix: "",
                useCustomRequestHandler: false,
                bucketCustomHeaders: "",
                forcePathStyle: true,
            })
            .mockResolvedValueOnce("cancelled");

        await manager.onBucketManualSetup(UserMode.ExistingUser, setting.currentSettings());

        expect(setting.currentSettings().remoteConfigurations).toEqual(before);
        expect(setting.currentSettings().activeConfigurationId).toBe("existing");
    });
});

describe("supported remote types", () => {
    it("rejects a Setup URI which does not contain an S3 connection", async () => {
        const { manager, dialogManager } = createSetupManager();
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce({
            ...createLegacyRemoteSetting(),
            remoteType: REMOTE_COUCHDB,
        });
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);

        await expect(manager.onUseSetupURI(UserMode.Unknown)).resolves.toBe(false);
        expect(confirm).not.toHaveBeenCalled();
    });

    it("joins straight away when a Setup URI is used on an unconfigured device", async () => {
        const { manager, dialogManager, core, setting } = createSetupManager();
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(createLegacyRemoteSetting());
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard");

        await expect(manager.onUseSetupURI(UserMode.Unknown)).resolves.toBe(true);
        expect(confirm).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleFetch).toHaveBeenCalledOnce();
        expect(setting.currentSettings()).toMatchObject({ remoteType: REMOTE_MINIO, isConfigured: true });
    });

    it("reviews a Setup URI used on a configured device", async () => {
        const { manager, dialogManager, setting } = createSetupManager();
        setting.settings = { ...setting.currentSettings(), isConfigured: true };
        dialogManager.openWithExplicitCancel.mockResolvedValueOnce(createLegacyRemoteSetting());
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);

        await expect(manager.onUseSetupURI(UserMode.Unknown)).resolves.toBe(true);
        expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ remoteType: REMOTE_MINIO }), UserMode.Unknown);
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

describe("plaintext receipt configuration", () => {
    it("retains the saved preference when encryption is turned off", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        const current = Object.assign(setting.currentSettings(), {
            encrypt: true,
            acceptUnencryptedContent: true,
        });
        dialogManager.openWithExplicitCancel.mockResolvedValue({ ...current, encrypt: false });
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);

        await expect(manager.onlyE2EEConfiguration(UserMode.Update, current)).resolves.toBe(true);

        expect(confirm).toHaveBeenCalledWith(
            expect.objectContaining({ encrypt: false, acceptUnencryptedContent: true }),
            UserMode.Update
        );
    });

    it("keeps the normal setup path when the E2EE passphrase changes with plaintext receipt", async () => {
        const { manager, setting, dialogManager } = createSetupManager();
        const current = Object.assign(setting.currentSettings(), {
            encrypt: true,
            passphrase: "old-passphrase",
            acceptUnencryptedContent: false,
        });
        dialogManager.openWithExplicitCancel.mockResolvedValue({
            ...current,
            passphrase: "new-passphrase",
            acceptUnencryptedContent: true,
        });
        const apply = vi.spyOn(setting, "applyPartial");
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard").mockResolvedValue(true);

        await expect(manager.onlyE2EEConfiguration(UserMode.Update, current)).resolves.toBe(true);

        expect(apply).not.toHaveBeenCalled();
        expect(confirm).toHaveBeenCalledWith(
            expect.objectContaining({ passphrase: "new-passphrase", acceptUnencryptedContent: true }),
            UserMode.Update
        );
    });

    it("applies a plaintext receipt preference alone without setup initialisation", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        const current = Object.assign(setting.currentSettings(), {
            encrypt: true,
            acceptUnencryptedContent: false,
        });
        dialogManager.openWithExplicitCancel.mockResolvedValue({ ...current, acceptUnencryptedContent: true });
        const apply = vi.spyOn(setting, "applyPartial").mockImplementation(async (partial) => {
            Object.assign(setting.settings, partial);
        });
        const confirm = vi.spyOn(manager, "onConfirmApplySettingsFromWizard");

        await expect(manager.onlyE2EEConfiguration(UserMode.Update, current)).resolves.toBe(true);

        expect(apply).toHaveBeenCalledWith(expect.objectContaining({ acceptUnencryptedContent: true }), true);
        expect(confirm).not.toHaveBeenCalled();
        expect((setting.currentSettings() as any).acceptUnencryptedContent).toBe(true);
        expect(core.rebuilder.scheduleRebuild).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
    });

    it("does not show the Metadata Rebuild warning when only plaintext receipt changes", async () => {
        const { manager, setting, dialogManager, core } = createSetupManager();
        const current = Object.assign(setting.currentSettings(), {
            encrypt: true,
            encryptInternalMetadata: true,
            acceptUnencryptedContent: false,
            remoteType: REMOTE_COUCHDB,
        });
        dialogManager.openWithExplicitCancel.mockResolvedValue({ ...current, acceptUnencryptedContent: true });
        const ask = vi.fn(async (_message: string, choices: string[]) => choices[0]);
        core.confirm = { askSelectStringDialogue: ask };
        const apply = vi.spyOn(setting, "applyPartial").mockResolvedValue(undefined);

        await expect(manager.onlyE2EEConfiguration(UserMode.Update, current)).resolves.toBe(true);

        expect(ask).not.toHaveBeenCalled();
        expect(apply).toHaveBeenCalledWith(expect.objectContaining({ acceptUnencryptedContent: true }), true);
        expect(core.rebuilder.scheduleRebuild).not.toHaveBeenCalled();
        expect(core.rebuilder.scheduleFetch).not.toHaveBeenCalled();
    });
});
