import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "@vrtmrz/livesync-commonlib/context";
import {
    DEFAULT_SETTINGS,
    REMOTE_COUCHDB,
    REMOTE_MINIO,
    type ObsidianLiveSyncSettings,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { IAPIService } from "@vrtmrz/livesync-commonlib/compat/services/base/IService";
import { MemoryValueStore } from "@vrtmrz/value-store";
import type { ObsidianServiceContext } from "@/modules/services/ObsidianServiceContext";
import { normaliseObsidianSettingsData } from "./ObsidianSettingService.ts";
import { ObsidianSettingService } from "./ObsidianSettingService.ts";

function createSettingService(
    vaultName: string,
    deviceValues: MemoryValueStore,
    savedData?: unknown,
    saveData = vi.fn(async (_settings: unknown) => undefined)
): ObsidianSettingService<ObsidianServiceContext> {
    const context = createServiceContext() as unknown as ObsidianServiceContext;
    context.liveSyncPlugin = {
        loadData: vi.fn(async () => savedData),
        saveData,
    } as unknown as ObsidianServiceContext["liveSyncPlugin"];
    const APIService = {
        addLog: () => undefined,
        getSystemVaultName: () => vaultName,
        getAppID: () => "test-app",
    } as unknown as IAPIService;
    return new ObsidianSettingService(context, { APIService, deviceValues });
}

describe("normaliseObsidianSettingsData", () => {
    it("maps Obsidian's missing data value to Commonlib's new-Vault input", () => {
        expect(normaliseObsidianSettingsData(null)).toBeUndefined();
    });

    it("preserves stored settings", () => {
        const settings = { isConfigured: false } as ObsidianLiveSyncSettings;

        expect(normaliseObsidianSettingsData(settings)).toBe(settings);
    });

    it("keeps injected device values independent from each Vault-scoped configuration store", async () => {
        const firstValues = new MemoryValueStore();
        const secondValues = new MemoryValueStore();
        const firstSetting = createSettingService("first-vault", firstValues);
        const secondSetting = createSettingService("second-vault", secondValues);

        await firstSetting.deviceValues.setValue("shared-key", "device value");
        await firstSetting.config.setValue("shared-key", "first config");
        await secondSetting.config.setValue("shared-key", "second config");

        expect(firstSetting.deviceValues).toBe(firstValues);
        expect(secondSetting.deviceValues).toBe(secondValues);
        expect(firstSetting.deviceValues).not.toBe(secondSetting.deviceValues);
        expect(firstSetting.config).not.toBe(firstValues);
        expect(firstSetting.config).not.toBe(secondSetting.config);
        await expect(firstSetting.deviceValues.getValue("shared-key")).resolves.toBe("device value");
        await expect(firstSetting.config.getValue("shared-key")).resolves.toBe("first config");
        await expect(secondSetting.config.getValue("shared-key")).resolves.toBe("second config");
        await expect(firstValues.getValue("first-vault-shared-key")).resolves.toBe("first config");
        await expect(secondValues.getValue("second-vault-shared-key")).resolves.toBe("second config");
    });
});

describe("ObsidianSettingService", () => {
    it("enforces the Red Sync remote and synchronisation behaviour when adjusting settings", async () => {
        const service = createSettingService("vault", new MemoryValueStore());
        const adjusted = await service.adjustSettings({
            ...DEFAULT_SETTINGS,
            remoteType: REMOTE_COUCHDB,
            liveSync: true,
            syncInternalFiles: true,
            region: "us-east-1",
            syncOnSave: false,
        } as ObsidianLiveSyncSettings);

        expect(adjusted).toMatchObject({
            remoteType: REMOTE_MINIO,
            liveSync: false,
            syncInternalFiles: false,
            region: "auto",
            useCustomRequestHandler: true,
        });
        // The automatic triggers remain under the user's control.
        expect(adjusted.syncOnSave).toBe(false);
    });

    it("saves settings through the plug-in without altering them", async () => {
        const saveData = vi.fn(async (_settings: unknown) => undefined);
        const service = createSettingService("vault", new MemoryValueStore(), undefined, saveData);
        await service.loadSettings();
        await service.saveSettingData();

        expect(saveData).toHaveBeenCalled();
        expect(saveData.mock.calls[saveData.mock.calls.length - 1]?.[0]).toMatchObject({ remoteType: REMOTE_MINIO });
    });

    it("treats an unconfigured bucket size warning as unlimited", async () => {
        const service = createSettingService("vault", new MemoryValueStore());
        const adjusted = await service.adjustSettings({
            ...DEFAULT_SETTINGS,
            notifyThresholdOfRemoteStorageSize: -1,
        } as ObsidianLiveSyncSettings);
        expect(adjusted.notifyThresholdOfRemoteStorageSize).toBe(0);
    });

    it("keeps a configured bucket size warning when the engine resets it", async () => {
        const service = createSettingService("vault", new MemoryValueStore());
        await service.loadSettings();
        await service.applyPartial({ notifyThresholdOfRemoteStorageSize: 2000 });
        await service.applyPartial({ notifyThresholdOfRemoteStorageSize: -1 });
        expect(service.currentSettings().notifyThresholdOfRemoteStorageSize).toBe(2000);
        await service.applyPartial({ notifyThresholdOfRemoteStorageSize: 0 });
        expect(service.currentSettings().notifyThresholdOfRemoteStorageSize).toBe(0);
    });

    it("stores the stats-for-nerds preference on this device", async () => {
        const values = new MemoryValueStore();
        const service = createSettingService("vault", values);
        await service.loadSettings();
        expect(service.statsForNerds).toBe(false);
        await service.setStatsForNerds(true);
        const reloaded = createSettingService("vault", values);
        await reloaded.loadSettings();
        expect(reloaded.statsForNerds).toBe(true);
    });
});
