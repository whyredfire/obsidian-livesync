import { describe, expect, it, vi } from "vitest";
import { EVENT_SETTING_SAVED } from "@/common/events";
vi.mock("@/common/utils", () => ({
    isValidPath: () => true,
}));
import { useStartupLifecycleFeature } from "./index";
import { STARTUP_LIFECYCLE_LAYOUT_PRIORITY } from "./startupLifecycle";
import type { StartupLifecycleFeatureOptions, StartupLifecycleHost } from "./types";

function createHost() {
    const addLayoutHandler = vi.fn();
    const addFirstInitialiseHandler = vi.fn();
    const eventHandlers = new Map<
        string,
        { callback: (...args: unknown[]) => unknown; unsubscribe: ReturnType<typeof vi.fn> }
    >();
    const onEvent = vi.fn((event: string, callback: (...args: unknown[]) => unknown) => {
        const unsubscribe = vi.fn();
        eventHandlers.set(event, { callback, unsubscribe });
        return unsubscribe;
    });
    const host = {
        services: {
            API: {},
            UI: {},
            appLifecycle: {
                onLayoutReady: { addHandler: addLayoutHandler },
                onFirstInitialise: { addHandler: addFirstInitialiseHandler },
            },
            context: {
                events: { onEvent },
                noticeGroups: {},
                translate: String,
            },
            setting: {
                currentSettings: vi.fn(() => ({ isConfigured: true })),
            },
        },
        serviceModules: {},
    } as unknown as StartupLifecycleHost;
    return { addFirstInitialiseHandler, addLayoutHandler, eventHandlers, host, onEvent };
}

function createOptions(events: string[] = []): StartupLifecycleFeatureOptions {
    return {
        databaseReady: true,
        reportDatabaseNotReady: vi.fn(() => events.push("database-not-ready")),
        migrateBulkSend: vi.fn(async () => {
            events.push("bulk-send");
        }),
        log: vi.fn(),
    };
}

describe("useStartupLifecycleFeature", () => {
    it("registers layout admission at priority 1 and runs start-up without questions", async () => {
        const events: string[] = [];
        const { addFirstInitialiseHandler, addLayoutHandler, host } = createHost();
        useStartupLifecycleFeature(host, createOptions(events));

        expect(addLayoutHandler).toHaveBeenCalledWith(expect.any(Function), STARTUP_LIFECYCLE_LAYOUT_PRIORITY);
        const layoutAdmission = addLayoutHandler.mock.calls[0][0] as () => Promise<boolean>;
        await expect(layoutAdmission()).resolves.toBe(true);
        const firstInitialise = addFirstInitialiseHandler.mock.calls[0][0] as () => Promise<boolean>;
        await expect(firstInitialise()).resolves.toBe(true);
        expect(events).toEqual(["bulk-send"]);
    });

    it("stops first-initialise while the database is not ready", async () => {
        const events: string[] = [];
        const { addFirstInitialiseHandler, addLayoutHandler, host } = createHost();
        const options = { ...createOptions(events), databaseReady: () => false };
        useStartupLifecycleFeature(host, options);
        await (addLayoutHandler.mock.calls[0][0] as () => Promise<boolean>)();
        await expect((addFirstInitialiseHandler.mock.calls[0][0] as () => Promise<boolean>)()).resolves.toBe(false);
        expect(events).toEqual(["database-not-ready"]);
    });

    it("does not re-admit a Vault which was unconfigured at its first layout invocation", async () => {
        const { addFirstInitialiseHandler, addLayoutHandler, eventHandlers, host } = createHost();
        const options = { ...createOptions(), configured: false } satisfies StartupLifecycleFeatureOptions;
        useStartupLifecycleFeature(host, options);
        const layoutAdmission = addLayoutHandler.mock.calls[0][0] as () => Promise<boolean>;

        await expect(layoutAdmission()).resolves.toBe(false);
        Object.assign(options, { configured: true });
        await expect(layoutAdmission()).resolves.toBe(false);
        const firstInitialise = addFirstInitialiseHandler.mock.calls[0][0] as () => Promise<boolean>;
        await expect(firstInitialise()).resolves.toBe(false);
        expect(options.migrateBulkSend).not.toHaveBeenCalled();
        expect(eventHandlers.has(EVENT_SETTING_SAVED)).toBe(false);
    });

    it("retires an admitted generation when settings become unconfigured", async () => {
        const { addFirstInitialiseHandler, addLayoutHandler, eventHandlers, host } = createHost();
        let configured = true;
        const options = { ...createOptions(), configured: () => configured } satisfies StartupLifecycleFeatureOptions;
        useStartupLifecycleFeature(host, options);
        const layoutAdmission = addLayoutHandler.mock.calls[0][0] as () => Promise<boolean>;
        await expect(layoutAdmission()).resolves.toBe(true);

        const settingSaved = eventHandlers.get(EVENT_SETTING_SAVED)!.callback as (settings: unknown) => unknown;
        await settingSaved({ isConfigured: true });
        expect(eventHandlers.get(EVENT_SETTING_SAVED)!.unsubscribe).not.toHaveBeenCalled();

        configured = false;
        await settingSaved({ isConfigured: false });
        expect(eventHandlers.get(EVENT_SETTING_SAVED)!.unsubscribe).toHaveBeenCalledOnce();

        configured = true;
        await expect(layoutAdmission()).resolves.toBe(false);
        const firstInitialise = addFirstInitialiseHandler.mock.calls[0][0] as () => Promise<boolean>;
        await expect(firstInitialise()).resolves.toBe(false);
    });
});
