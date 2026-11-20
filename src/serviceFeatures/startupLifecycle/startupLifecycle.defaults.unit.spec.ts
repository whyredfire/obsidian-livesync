import { describe, expect, it, vi } from "vitest";

const operationMocks = vi.hoisted(() => ({
    migrateBulkSendSetting: vi.fn(),
}));

vi.mock("./bulkSettingMigration", () => ({
    migrateBulkSendSetting: operationMocks.migrateBulkSendSetting,
}));

import { useStartupLifecycleFeature } from "./index";
import type { StartupLifecycleHost } from "./types";

describe("useStartupLifecycleFeature default operation wiring", () => {
    it("maps the host services to the start-up migration", async () => {
        const log = vi.fn();
        const settings = { isConfigured: true, sendChunksBulk: false, sendChunksBulkMaxSize: 1 };
        const addLayoutHandler = vi.fn();
        const addFirstInitialiseHandler = vi.fn();
        const setting = {
            settings,
            currentSettings: vi.fn(() => settings),
            saveSettingData: vi.fn(async () => undefined),
        };
        const host = {
            services: {
                API: {},
                UI: {},
                appLifecycle: {
                    onLayoutReady: { addHandler: addLayoutHandler },
                    onFirstInitialise: { addHandler: addFirstInitialiseHandler },
                },
                context: { events: { onEvent: vi.fn(() => vi.fn()) }, noticeGroups: {}, translate: String },
                database: { localDatabase: { isReady: true } },
                setting,
            },
            serviceModules: {},
        } as unknown as StartupLifecycleHost;
        operationMocks.migrateBulkSendSetting.mockResolvedValue(undefined);

        useStartupLifecycleFeature(host, { log });
        expect(operationMocks.migrateBulkSendSetting).not.toHaveBeenCalled();

        await expect((addLayoutHandler.mock.calls[0]?.[0] as () => Promise<boolean>)()).resolves.toBe(true);
        await expect((addFirstInitialiseHandler.mock.calls[0]?.[0] as () => Promise<boolean>)()).resolves.toBe(true);

        const bulk = operationMocks.migrateBulkSendSetting.mock.calls[0]?.[0];
        expect(bulk).toMatchObject({ settings, log });
        await bulk?.saveSettings();
        expect(setting.saveSettingData).toHaveBeenCalledOnce();
    });
});
