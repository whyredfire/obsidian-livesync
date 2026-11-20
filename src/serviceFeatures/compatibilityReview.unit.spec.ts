import { describe, expect, it, vi } from "vitest";
import { LOG_LEVEL_URGENT } from "octagonal-wheels/common/logger";
import {
    COMPATIBILITY_PAUSE_SETTING_MESSAGE,
    DATABASE_COMPATIBILITY_VERSION_KEY,
    legacyDatabaseCompatibilityVersionKey,
} from "./compatibilityReview.evaluation.ts";
import { CompatibilityReviewController, useCompatibilityReview } from "./compatibilityReview.ts";

function migrationState(overrides: Record<string, unknown> = {}) {
    return {
        sourceVersion: 2,
        targetVersion: 2,
        isNewVault: false,
        isFromFutureSchema: false,
        changed: false,
        requiresSyncReview: false,
        reviewReasons: [],
        ...overrides,
    };
}

function createFixture(
    options: {
        marker?: string | null;
        legacyMarker?: string | null;
        versionUpFlash?: string;
        isConfigured?: boolean;
        migration?: Record<string, unknown>;
    } = {}
) {
    const local = new Map<string, string>();
    const deviceValues = new Map<string, string>();
    if (options.marker !== undefined && options.marker !== null) {
        local.set(DATABASE_COMPATIBILITY_VERSION_KEY, options.marker);
    }
    const legacyKey = legacyDatabaseCompatibilityVersionKey("Test Vault");
    if (options.legacyMarker !== undefined && options.legacyMarker !== null) {
        deviceValues.set(legacyKey, options.legacyMarker);
    }
    const config = {
        getValue: vi.fn(async (key: string, defaultValue = "") => local.get(key) ?? defaultValue),
        setValue: vi.fn(async (key: string, value: string) => {
            local.set(key, value);
        }),
        delete: vi.fn(async (key: string) => {
            local.delete(key);
        }),
    };
    const deviceValueStore = {
        getValue: vi.fn(async (key: string, defaultValue = "") => deviceValues.get(key) ?? defaultValue),
        setValue: vi.fn(async (key: string, value: string) => {
            deviceValues.set(key, value);
        }),
        delete: vi.fn(async (key: string) => {
            deviceValues.delete(key);
        }),
    };
    const settings = {
        versionUpFlash: options.versionUpFlash ?? "",
        isConfigured: options.isConfigured ?? true,
    };
    const saveSettingData = vi.fn().mockResolvedValue(undefined);
    const applySettings = vi.fn().mockResolvedValue(true);
    const setting = {
        currentSettings: () => settings,
        getSettingsMigrationState: () => migrationState(options.migration),
        deviceValues: deviceValueStore,
        saveSettingData,
    };
    const core = {
        services: {
            setting,
            config,
            vault: { getVaultName: () => "Test Vault" },
            control: { applySettings },
        },
    } as never;
    const log = vi.fn();
    const controller = new CompatibilityReviewController(core, log, 12);
    return {
        controller,
        log,
        local,
        deviceValues,
        config,
        deviceValueStore,
        legacyKey,
        settings,
        saveSettingData,
        applySettings,
    };
}

describe("compatibility pause", () => {
    it("initialises the acknowledged version for a new Vault without showing a pause", async () => {
        const fixture = createFixture({ marker: null, isConfigured: false, migration: { isNewVault: true } });

        expect(fixture.controller.initialised).toBe(false);

        await expect(fixture.controller.initialise()).resolves.toBe(true);

        expect(fixture.controller.initialised).toBe(true);
        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("12");
        expect(fixture.controller.pendingPause).toBeUndefined();
        expect(fixture.saveSettingData).not.toHaveBeenCalled();
    });

    it("defers a missing database marker while the Vault remains unconfigured", async () => {
        const fixture = createFixture({ marker: null, isConfigured: false });

        await expect(fixture.controller.initialise()).resolves.toBe(true);

        expect(fixture.controller.pendingPause).toBeUndefined();
        expect(fixture.settings.versionUpFlash).toBe("");
        expect(fixture.local.has(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe(false);
        expect(fixture.saveSettingData).not.toHaveBeenCalled();

        fixture.settings.isConfigured = true;
        await expect(fixture.controller.initialise()).resolves.toBe(true);

        expect(fixture.controller.pendingPause).toBeUndefined();
        expect(fixture.settings.versionUpFlash).toBe("");
        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("12");
        expect(fixture.saveSettingData).not.toHaveBeenCalled();
    });

    it("resumes an upgrade pause automatically without asking", async () => {
        const fixture = createFixture({ marker: "11" });

        await fixture.controller.initialise();
        expect(fixture.settings.versionUpFlash).toBe(COMPATIBILITY_PAUSE_SETTING_MESSAGE);
        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("11");

        await fixture.controller.settle();

        expect(fixture.settings.versionUpFlash).toBe("");
        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("12");
        expect(fixture.applySettings).toHaveBeenCalledOnce();
        expect(fixture.controller.pendingPause).toBeUndefined();
        expect(fixture.log).not.toHaveBeenCalledWith(expect.anything(), LOG_LEVEL_URGENT);
    });

    it("keeps a downgrade paused and says once that this device needs an update", async () => {
        const fixture = createFixture({ marker: "13" });

        await fixture.controller.initialise();
        await fixture.controller.settle();

        expect(fixture.controller.pendingPause?.resumable).toBe(false);
        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("13");
        expect(fixture.applySettings).not.toHaveBeenCalled();
        expect(fixture.log).toHaveBeenCalledWith(expect.stringContaining("Update Red Sync"), LOG_LEVEL_URGENT);
    });

    it("migrates the old Vault-scoped marker to Commonlib device-local storage", async () => {
        const fixture = createFixture({ legacyMarker: "11" });

        await fixture.controller.initialise();

        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("11");
        expect(fixture.deviceValues.has(fixture.legacyKey)).toBe(false);
        expect(fixture.controller.pendingPause).toBeDefined();
    });

    it("keeps the pause if saving the acknowledgement fails", async () => {
        const fixture = createFixture({ marker: "11" });
        await fixture.controller.initialise();
        fixture.saveSettingData.mockRejectedValueOnce(new Error("save failed"));

        await expect(fixture.controller.settle()).rejects.toThrow("save failed");

        expect(fixture.settings.versionUpFlash).toBe(COMPATIBILITY_PAUSE_SETTING_MESSAGE);
        expect(fixture.local.get(DATABASE_COMPATIBILITY_VERSION_KEY)).toBe("11");
        expect(fixture.applySettings).not.toHaveBeenCalled();
    });

    it("does nothing after it has been disposed", async () => {
        const fixture = createFixture({ marker: "11" });
        await fixture.controller.initialise();
        fixture.controller.dispose();
        await fixture.controller.settle();
        expect(fixture.applySettings).not.toHaveBeenCalled();
    });

    it("settles the pause after scheduled Fetch and Rebuild, without a command", async () => {
        const layout: { handler: () => Promise<boolean>; priority: number }[] = [];
        const addCommand = vi.fn();
        const host = {
            services: {
                API: { addLog: vi.fn(), addCommand },
                appLifecycle: {
                    onSettingLoaded: { addHandler: vi.fn() },
                    onLayoutReady: {
                        addHandler: vi.fn((handler: () => Promise<boolean>, priority: number) =>
                            layout.push({ handler, priority })
                        ),
                    },
                    onUnload: { addHandler: vi.fn() },
                },
            },
        } as never;

        useCompatibilityReview(host);

        expect(layout).toHaveLength(1);
        expect(layout[0].priority).toBeGreaterThan(20);
        expect(addCommand).not.toHaveBeenCalled();
    });
});
