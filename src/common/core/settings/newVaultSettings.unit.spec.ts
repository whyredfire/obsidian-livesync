import { describe, expect, it } from "vitest";
import {
    NEW_VAULT_SETTINGS,
    SETTINGS_SCHEMA_DEFAULTS,
    createNewVaultSettings as createCommonlibNewVaultSettings,
} from "@vrtmrz/livesync-commonlib/settings";
import { REMOTE_MINIO } from "@vrtmrz/livesync-commonlib/compat/common/types";
import {
    createNewVaultSettings,
    isAutomaticSyncEnabled,
    RED_SYNC_ENFORCED_SETTINGS,
    RED_SYNC_SYNC_TRIGGERS_OFF,
} from "./newVaultSettings.ts";

describe("createNewVaultSettings", () => {
    it("selects NFC path identity only for new host settings", () => {
        expect(SETTINGS_SCHEMA_DEFAULTS.pathNormalizationVersion).toBe(0);
        expect(NEW_VAULT_SETTINGS.pathNormalizationVersion).toBe(0);
        expect(createCommonlibNewVaultSettings().pathNormalizationVersion).toBe(0);
        expect(createNewVaultSettings().pathNormalizationVersion).toBe(1);
    });

    it("keeps remote configurations independent of shared and other new-Vault settings", () => {
        const first = createNewVaultSettings();
        const second = createNewVaultSettings();
        const shared = createCommonlibNewVaultSettings();

        expect(first.remoteConfigurations).not.toBe(second.remoteConfigurations);
        expect(first.remoteConfigurations).not.toBe(shared.remoteConfigurations);
        expect(first.pluginSyncExtendedSetting).not.toBe(second.pluginSyncExtendedSetting);
        expect(first.pluginSyncExtendedSetting).not.toBe(shared.pluginSyncExtendedSetting);

        first.remoteConfigurations.example = {
            id: "example",
            name: "Example",
            uri: "sls+http://localhost/",
            isEncrypted: false,
        };

        expect(second.remoteConfigurations).toEqual({});
        expect(shared.remoteConfigurations).toEqual({});
        expect(NEW_VAULT_SETTINGS.remoteConfigurations).toEqual({});
        expect(NEW_VAULT_SETTINGS.pluginSyncExtendedSetting).toEqual({});
    });

    it("configures Cloudflare R2 with event-driven synchronisation and encryption off", () => {
        const settings = createNewVaultSettings();

        expect(settings).toMatchObject({
            remoteType: REMOTE_MINIO,
            region: "auto",
            forcePathStyle: true,
            useCustomRequestHandler: true,
            liveSync: false,
            periodicReplication: false,
            syncOnStart: true,
            syncOnFileOpen: true,
            syncOnSave: true,
            batchSave: true,
            encrypt: false,
            syncInternalFiles: false,
            usePluginSync: false,
        });
        expect(isAutomaticSyncEnabled(settings)).toBe(true);
    });

    it("does not override the automatic synchronisation triggers when enforcing settings", () => {
        expect(Object.keys(RED_SYNC_ENFORCED_SETTINGS)).not.toEqual(
            expect.arrayContaining(Object.keys(RED_SYNC_SYNC_TRIGGERS_OFF))
        );
        for (const key of Object.keys(RED_SYNC_SYNC_TRIGGERS_OFF)) {
            expect(RED_SYNC_ENFORCED_SETTINGS).not.toHaveProperty(key);
        }
        expect(isAutomaticSyncEnabled({ ...createNewVaultSettings(), ...RED_SYNC_SYNC_TRIGGERS_OFF })).toBe(false);
    });
});
