import { describe, expect, it, vi } from "vitest";
import { NO_INTERACTION, type ReplicationOutcome } from "@vrtmrz/livesync-commonlib/replication";
import {
    createReplicationSchedulingContext,
    resumeReplicationScheduling,
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

function createHarness(overrides: Partial<{ isConfigured: boolean; syncOnStart: boolean }> = {}) {
    const settings = { isConfigured: true, syncOnStart: true, ...overrides };
    let ready = true;
    let suspended = false;
    const replicateUnattended = vi.fn(async (): Promise<ReplicationOutcome> => ({ status: "completed" }));
    const log = vi.fn();
    const context = createReplicationSchedulingContext({
        isReady: () => ready,
        isSuspended: () => suspended,
        currentSettings: () => settings,
        replicateUnattended,
        log,
    });
    return {
        context,
        log,
        replicateUnattended,
        settings,
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
