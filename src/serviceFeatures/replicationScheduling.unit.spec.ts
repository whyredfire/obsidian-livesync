import { describe, expect, it, vi } from "vitest";
import { NO_INTERACTION, type ReplicationOutcome } from "@vrtmrz/livesync-commonlib/replication";
import { EVENT_SETTING_SAVED } from "@/common/events";
import {
    createReplicationSchedulingContext,
    reconcilePeriodicReplication,
    resumeReplicationScheduling,
    runPeriodicReplication,
    suspendReplicationScheduling,
    useReplicationScheduling,
} from "./replicationScheduling";

function createDeferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

type HarnessSettings = {
    isConfigured: boolean;
    syncOnStart: boolean;
    syncOnFileOpen: boolean;
    syncOnSave: boolean;
    periodicReplicationInterval: number;
};

function createHarness(overrides: Partial<HarnessSettings> = {}) {
    const settings: HarnessSettings = {
        isConfigured: true,
        syncOnStart: true,
        syncOnFileOpen: true,
        syncOnSave: true,
        periodicReplicationInterval: 0,
        ...overrides,
    };
    let tick: (() => void) | undefined;
    const timer = {
        enable: vi.fn((_intervalMs: number, callback: () => void) => {
            tick = callback;
        }),
        disable: vi.fn(() => {
            tick = undefined;
        }),
    };
    let ready = true;
    let suspended = false;
    const replicateUnattended = vi.fn(async (): Promise<ReplicationOutcome> => ({ status: "completed" }));
    const log = vi.fn();
    const context = createReplicationSchedulingContext({
        isReady: () => ready,
        isSuspended: () => suspended,
        currentSettings: () => settings,
        replicateUnattended,
        timer,
        log,
    });
    return {
        context,
        log,
        replicateUnattended,
        settings,
        timer,
        tick: () => tick?.(),
        setReady: (value: boolean) => (ready = value),
        setSuspended: (value: boolean) => (suspended = value),
    };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("replication scheduling", () => {
    it("runs an unattended OneShot on resume when sync on start is enabled", async () => {
        const harness = createHarness();
        resumeReplicationScheduling(harness.context);
        await flush();
        expect(harness.replicateUnattended).toHaveBeenCalledExactlyOnceWith({
            trigger: "resume",
            interaction: NO_INTERACTION,
        });
    });

    it.each([
        ["sync on start is disabled", { syncOnStart: false }],
        ["the vault is not configured", { isConfigured: false }],
    ])("does nothing on resume when %s", async (_label, overrides) => {
        const harness = createHarness(overrides);
        resumeReplicationScheduling(harness.context);
        await flush();
        expect(harness.replicateUnattended).not.toHaveBeenCalled();
    });

    it("does nothing while the application is not ready or is suspended", async () => {
        const harness = createHarness();
        harness.setReady(false);
        resumeReplicationScheduling(harness.context);
        await flush();
        suspendReplicationScheduling(harness.context);
        harness.setReady(true);
        harness.setSuspended(true);
        resumeReplicationScheduling(harness.context);
        await flush();
        expect(harness.replicateUnattended).not.toHaveBeenCalled();
    });

    it("coalesces duplicate resume notifications within one lifecycle generation", async () => {
        const harness = createHarness();
        const pending = createDeferred<ReplicationOutcome>();
        harness.replicateUnattended.mockReturnValueOnce(pending.promise);
        resumeReplicationScheduling(harness.context);
        resumeReplicationScheduling(harness.context);
        pending.resolve({ status: "completed" });
        await flush();
        expect(harness.replicateUnattended).toHaveBeenCalledOnce();
    });

    it("runs a new lifecycle generation after the running one finishes", async () => {
        const harness = createHarness();
        const pending = createDeferred<ReplicationOutcome>();
        harness.replicateUnattended.mockReturnValueOnce(pending.promise);
        resumeReplicationScheduling(harness.context);
        suspendReplicationScheduling(harness.context);
        resumeReplicationScheduling(harness.context);
        expect(harness.replicateUnattended).toHaveBeenCalledOnce();
        pending.resolve({ status: "completed" });
        await flush();
        await flush();
        expect(harness.replicateUnattended).toHaveBeenCalledTimes(2);
    });

    it("logs a failed start-up synchronisation instead of rejecting", async () => {
        const harness = createHarness();
        const failure = new Error("offline");
        harness.replicateUnattended.mockRejectedValueOnce(failure);
        resumeReplicationScheduling(harness.context);
        await flush();
        expect(harness.log).toHaveBeenCalledWith(failure);
    });
});

describe("replication scheduling serviceFeature", () => {
    it("binds resume, suspend, and unload handlers", async () => {
        const handlers: Record<string, () => Promise<boolean>> = {};
        const handler = (name: string) => ({
            addHandler: vi.fn((fn: () => Promise<boolean>) => (handlers[name] = fn)),
        });
        const replicateUnattended = vi.fn(async () => ({ status: "completed" }));
        const host = {
            services: {
                API: { addLog: vi.fn() },
                appLifecycle: {
                    isReady: () => true,
                    isSuspended: () => false,
                    onUnload: handler("unload"),
                    onSuspending: handler("suspending"),
                    onResumed: handler("resumed"),
                },
                replication: { replicateUnattended },
                setting: { currentSettings: () => ({ isConfigured: true, syncOnStart: true }) },
                context: { events: { onEvent: vi.fn() } },
            },
        } as unknown as Parameters<typeof useReplicationScheduling>[0];

        useReplicationScheduling(host);
        expect(Object.keys(handlers).sort()).toEqual(["resumed", "suspending", "unload"]);

        await handlers.resumed();
        await flush();
        expect(replicateUnattended).toHaveBeenCalledOnce();

        await handlers.suspending();
        await handlers.unload();
        expect(replicateUnattended).toHaveBeenCalledOnce();
    });
});

describe("periodic synchronisation", () => {
    it("starts the timer on resume at the configured interval while automatic sync is on", () => {
        const harness = createHarness({ periodicReplicationInterval: 30 });
        resumeReplicationScheduling(harness.context);
        expect(harness.timer.enable).toHaveBeenCalledExactlyOnceWith(30_000, expect.any(Function));
    });

    it.each([
        ["the interval is 0", { periodicReplicationInterval: 0 }],
        [
            "automatic sync is off",
            { periodicReplicationInterval: 30, syncOnStart: false, syncOnFileOpen: false, syncOnSave: false },
        ],
        ["the vault is not configured", { periodicReplicationInterval: 30, isConfigured: false }],
    ])("does not start the timer when %s", (_label, overrides) => {
        const harness = createHarness(overrides);
        resumeReplicationScheduling(harness.context);
        expect(harness.timer.enable).not.toHaveBeenCalled();
    });

    it("runs an unattended periodic OneShot on each tick", async () => {
        const harness = createHarness({ periodicReplicationInterval: 30, syncOnStart: false });
        resumeReplicationScheduling(harness.context);
        harness.tick();
        await flush();
        expect(harness.replicateUnattended).toHaveBeenCalledExactlyOnceWith({
            trigger: "periodic",
            interaction: NO_INTERACTION,
        });
    });

    it("skips a tick while the previous periodic synchronisation is still running", async () => {
        const harness = createHarness({ periodicReplicationInterval: 30, syncOnStart: false });
        const pending = createDeferred<ReplicationOutcome>();
        harness.replicateUnattended.mockReturnValueOnce(pending.promise);
        resumeReplicationScheduling(harness.context);
        harness.tick();
        harness.tick();
        expect(harness.replicateUnattended).toHaveBeenCalledOnce();
        pending.resolve({ status: "completed" });
        await flush();
        harness.tick();
        await flush();
        expect(harness.replicateUnattended).toHaveBeenCalledTimes(2);
    });

    it("follows settings changes without restarting an unchanged timer", () => {
        const harness = createHarness({ periodicReplicationInterval: 30 });
        resumeReplicationScheduling(harness.context);
        reconcilePeriodicReplication(harness.context);
        expect(harness.timer.enable).toHaveBeenCalledOnce();

        harness.settings.periodicReplicationInterval = 120;
        reconcilePeriodicReplication(harness.context);
        expect(harness.timer.enable).toHaveBeenLastCalledWith(120_000, expect.any(Function));

        Object.assign(harness.settings, { syncOnStart: false, syncOnFileOpen: false, syncOnSave: false });
        reconcilePeriodicReplication(harness.context);
        expect(harness.timer.disable).toHaveBeenCalledOnce();
    });

    it("stops on suspend and ignores a tick which was already queued", async () => {
        const harness = createHarness({ periodicReplicationInterval: 30, syncOnStart: false });
        resumeReplicationScheduling(harness.context);
        suspendReplicationScheduling(harness.context);
        expect(harness.timer.disable).toHaveBeenCalledOnce();
        await runPeriodicReplication(harness.context);
        expect(harness.replicateUnattended).not.toHaveBeenCalled();
    });

    it("logs a failed periodic synchronisation and keeps running", async () => {
        const harness = createHarness({ periodicReplicationInterval: 30, syncOnStart: false });
        const failure = new Error("offline");
        harness.replicateUnattended.mockRejectedValueOnce(failure);
        resumeReplicationScheduling(harness.context);
        await runPeriodicReplication(harness.context);
        expect(harness.log).toHaveBeenCalledWith(failure);
        await runPeriodicReplication(harness.context);
        expect(harness.replicateUnattended).toHaveBeenCalledTimes(2);
    });

    it("reconciles the timer when settings are saved", () => {
        const onEvent = vi.fn();
        const setInterval = vi.fn(() => 7);
        const clearInterval = vi.fn();
        const settings = {
            isConfigured: true,
            syncOnStart: false,
            syncOnFileOpen: true,
            syncOnSave: true,
            periodicReplicationInterval: 0,
        };
        const handlers: Record<string, () => Promise<boolean>> = {};
        const handler = (name: string) => ({
            addHandler: vi.fn((fn: () => Promise<boolean>) => (handlers[name] = fn)),
        });
        const host = {
            services: {
                API: { addLog: vi.fn(), setInterval, clearInterval },
                appLifecycle: {
                    isReady: () => true,
                    isSuspended: () => false,
                    onUnload: handler("unload"),
                    onSuspending: handler("suspending"),
                    onResumed: handler("resumed"),
                },
                replication: { replicateUnattended: vi.fn() },
                setting: { currentSettings: () => settings },
                context: { events: { onEvent } },
            },
        } as unknown as Parameters<typeof useReplicationScheduling>[0];

        useReplicationScheduling(host);
        void handlers.resumed();
        expect(setInterval).not.toHaveBeenCalled();

        const [eventName, onSaved] = onEvent.mock.calls[0] as unknown as [string, () => void];
        expect(eventName).toBe(EVENT_SETTING_SAVED);
        settings.periodicReplicationInterval = 45;
        onSaved();
        expect(setInterval).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 45_000);

        settings.periodicReplicationInterval = 0;
        onSaved();
        expect(clearInterval).toHaveBeenCalledExactlyOnceWith(7);
    });
});
