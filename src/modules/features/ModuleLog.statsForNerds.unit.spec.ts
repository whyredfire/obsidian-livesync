import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/settings";

vi.mock("@/deps.ts", () => ({
    addIcon: vi.fn(),
    debounce: (callback: () => void) => callback,
    normalizePath: (path: string) => path,
    Notice: class {},
    stringifyYaml: vi.fn(),
}));
vi.mock("./Log/LogPaneView.ts", () => ({ LogPaneView: class {}, VIEW_TYPE_LOG: "log" }));
vi.mock("@/modules/features/ModuleLog/diagnostics/reportTool.ts", () => ({ generateReport: vi.fn() }));
vi.mock("@/common/utils.ts", () => ({ isValidPath: () => true }));
vi.mock("@/common/translation", () => ({ $msg: (key: string) => key }));
vi.mock("@/common/events.ts", () => ({
    EVENT_FILE_RENAMED: "renamed",
    EVENT_LAYOUT_READY: "ready",
    EVENT_LEAF_ACTIVE_CHANGED: "active",
    EVENT_ON_UNRESOLVED_ERROR: "error",
    EVENT_STATS_FOR_NERDS_CHANGED: "stats-for-nerds-changed",
    eventHub: { onEvent: vi.fn() },
}));
vi.mock("@vrtmrz/livesync-commonlib/compat/replication/trystero/P2PLogCollector", () => ({
    P2PLogCollector: class {},
}));
vi.mock("@vrtmrz/livesync-commonlib/p2p", () => ({ EVENT_P2P_DIAGNOSTIC: "p2p-diagnostic" }));

const cleanups: (() => void)[] = [];

async function createHarness(statsForNerds = false) {
    const { ModuleLog } = await import("./ModuleLog.ts");
    const { reactiveSource } = await import("octagonal-wheels/dataobject/reactive");
    const { createLiveSyncEventHub } = await import("@vrtmrz/livesync-commonlib/context");
    const { DEFAULT_SETTINGS } = await import("@vrtmrz/livesync-commonlib/compat/common/types");
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => callbacks.push(callback));
    const stats = reactiveSource({
        sent: 0,
        arrived: 0,
        maxPullSeq: 0,
        maxPushSeq: 0,
        lastSyncPullSeq: 0,
        lastSyncPushSeq: 0,
        syncStatus: "COMPLETED" as const,
    });
    const services = {
        API: {
            requestCount: reactiveSource(0),
            responseCount: reactiveSource(0),
            registerCleanup: (cleanup: () => void) => cleanups.push(cleanup),
        },
        context: { events: createLiveSyncEventHub(), notices: { show: vi.fn(), hide: vi.fn() } },
        setting: { statsForNerds },
        vault: { getVaultName: () => "vault" },
        appLifecycle: { isReloadingScheduled: () => false },
        replication: {
            replicationResultCount: reactiveSource(0),
            databaseQueueCount: reactiveSource(0),
            storageApplyingCount: reactiveSource(0),
        },
        replicator: { replicationStatics: stats, boundedRemoteActivityCount: reactiveSource(0) },
        conflict: { conflictProcessQueueCount: reactiveSource(0) },
        fileProcessing: { processing: reactiveSource(0), totalQueued: reactiveSource(0), batched: reactiveSource(0) },
    };
    const core: { services: typeof services; settings: ObsidianLiveSyncSettings } = {
        services,
        settings: {
            ...DEFAULT_SETTINGS,
            isConfigured: true,
            syncOnSave: true,
            syncOnEditorSave: false,
            syncOnStart: false,
            syncOnFileOpen: false,
            syncAfterMerge: false,
            showStatusOnEditor: true,
        },
    };
    const statusBarRenderer = { render: vi.fn(), dispose: vi.fn() };
    const statusLineRenderer = { render: vi.fn(), dispose: vi.fn() };
    const module = Object.assign(Object.create(ModuleLog.prototype), {
        core,
        statusLog: reactiveSource(""),
        activeFileStatus: reactiveSource(""),
        p2pLogCollector: { p2pReplicationStats: reactiveSource([]), dispose: vi.fn() },
        statusBarRenderer,
        statusLineRenderer,
        statusDiv: { setCssStyles: vi.fn() },
        statusBar: { setCssStyles: vi.fn() },
        notifies: {},
        logLines: [],
        logMessage: { innerText: "" },
    }) as InstanceType<typeof ModuleLog>;
    module.observeForLogs();

    const flushDisplay = async () => {
        await vi.advanceTimersByTimeAsync(50);
        for (const callback of callbacks.splice(0)) {
            callback(0);
        }
    };
    module.applyStatusBarText();
    await flushDisplay();
    return {
        module,
        core,
        services,
        stats,
        statusBarRenderer,
        statusLineRenderer,
        flushDisplay,
    } as const;
}

describe("stats for nerds", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });
    afterEach(() => {
        for (const cleanup of cleanups.splice(0)) {
            cleanup();
        }
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("hides the status bar and editor statistics by default", async () => {
        const host = await createHarness(false);
        expect(host.statusBarRenderer.render).not.toHaveBeenCalled();
        expect(host.module.statusBar?.setCssStyles).toHaveBeenLastCalledWith({ display: "none" });
        expect(host.module.statusDiv?.setCssStyles).toHaveBeenLastCalledWith({ display: "none" });
        expect(host.statusLineRenderer.render).not.toHaveBeenCalled();
    });

    it("shows statistics without a synchronisation-mode badge when enabled", async () => {
        const host = await createHarness(true);
        expect(host.module.statusBar?.setCssStyles).toHaveBeenLastCalledWith({ display: "" });
        const parts = host.statusBarRenderer.render.mock.calls[host.statusBarRenderer.render.mock.calls.length - 1]?.[0] as { key: string }[];
        expect(parts.some((part) => part.key === "sync")).toBe(true);
        expect(parts.some((part) => part.key === "sync-mode")).toBe(false);
        expect(host.statusLineRenderer.render).toHaveBeenCalled();
    });

    it("shows notice-level messages only when enabled, and urgent messages always", async () => {
        const { LOG_LEVEL_NOTICE, LOG_LEVEL_URGENT } = await import("octagonal-wheels/common/logger");
        const quiet = await createHarness(false);
        quiet.module.__addLog("Rebuild everything operation completed.", LOG_LEVEL_NOTICE);
        expect(quiet.services.context.notices.show).not.toHaveBeenCalled();
        quiet.module.__addLog("Something needs attention", LOG_LEVEL_URGENT);
        expect(quiet.services.context.notices.show).toHaveBeenCalledOnce();

        const nerd = await createHarness(true);
        nerd.module.__addLog("Rebuild everything operation completed.", LOG_LEVEL_NOTICE);
        expect(nerd.services.context.notices.show).toHaveBeenCalledOnce();
    });
});
