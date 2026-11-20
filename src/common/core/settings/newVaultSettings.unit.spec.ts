import { describe, expect, it } from "vitest";
import {
    NEW_VAULT_SETTINGS,
    SETTINGS_SCHEMA_DEFAULTS,
    createNewVaultSettings as createCommonlibNewVaultSettings,
} from "@vrtmrz/livesync-commonlib/settings";
import { REMOTE_MINIO } from "@vrtmrz/livesync-commonlib/compat/common/types";
import {
    createNewVaultSettings,
    DEFAULT_PERIODIC_SYNC_SECONDS,
    isAutomaticSyncEnabled,
    isValidPeriodicSyncSeconds,
    periodicSyncIntervalMs,
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
            periodicReplicationInterval: DEFAULT_PERIODIC_SYNC_SECONDS,
        });
        expect(isAutomaticSyncEnabled(settings)).toBe(true);
        expect(periodicSyncIntervalMs(settings)).toBe(DEFAULT_PERIODIC_SYNC_SECONDS * 1000);
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

describe("periodic synchronisation interval", () => {
    const on = { syncOnStart: true, syncOnFileOpen: true, syncOnSave: true };

    it("is off when the interval is 0 or automatic sync is off", () => {
        expect(periodicSyncIntervalMs({ ...on, periodicReplicationInterval: 0 })).toBeUndefined();
        expect(
            periodicSyncIntervalMs({ ...RED_SYNC_SYNC_TRIGGERS_OFF, periodicReplicationInterval: 60 })
        ).toBeUndefined();
    });

    it("never polls faster than the minimum", () => {
        expect(periodicSyncIntervalMs({ ...on, periodicReplicationInterval: 1 })).toBe(10_000);
        expect(periodicSyncIntervalMs({ ...on, periodicReplicationInterval: 90 })).toBe(90_000);
    });

    it("accepts 0 or whole seconds from the minimum upwards", () => {
        expect([0, 10, 60, 3600].every(isValidPeriodicSyncSeconds)).toBe(true);
        expect([-1, 5, 9, 12.5, Number.NaN].some(isValidPeriodicSyncSeconds)).toBe(false);
    });
});
