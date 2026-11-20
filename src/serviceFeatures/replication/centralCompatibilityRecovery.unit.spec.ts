import { describe, expect, it, vi } from "vitest";
import { MemoryValueStore } from "@vrtmrz/value-store";
import {
    CENTRAL_COMPATIBILITY_REJECTION_REASONS,
    NO_INTERACTION,
    REPLICATION_PROGRESS_PRESENTATIONS,
    USER_INITIATED_REPLICATION_AUTHORITY,
    replicationFailed,
} from "@vrtmrz/livesync-commonlib/replication";
import { AUTOMATIC_FETCH_INTERVAL_MS, createCentralCompatibilityRecovery } from "./centralCompatibilityRecovery";

function createRecovery(start = Date.UTC(2026, 10, 21, 9, 0)) {
    let clock = start;
    const config = new MemoryValueStore();
    const scheduleFetch = vi.fn(async () => true);
    const scheduleRestart = vi.fn();
    const recovery = createCentralCompatibilityRecovery({
        rebuilder: { scheduleFetch },
        services: { appLifecycle: { scheduleRestart }, setting: { config } },
        now: () => clock,
    } as never);
    return {
        recovery,
        scheduleFetch,
        scheduleRestart,
        advance: (ms: number) => (clock += ms),
    };
}

function failure(reason: string | undefined, interaction: unknown = NO_INTERACTION) {
    return {
        context: {},
        setting: {},
        outcome: replicationFailed(new Error("rejected"), reason ? ({ reason } as never) : undefined),
        progressPresentation: REPLICATION_PROGRESS_PRESENTATIONS.NOTICE,
        interaction,
    } as never;
}

describe("central compatibility recovery", () => {
    it.each([
        CENTRAL_COMPATIBILITY_REJECTION_REASONS.NODE_LOCKED,
        CENTRAL_COMPATIBILITY_REJECTION_REASONS.NODE_CLEANED,
        CENTRAL_COMPATIBILITY_REJECTION_REASONS.TWEAK_MISMATCH,
    ])("downloads again without asking when the remote rejects this device (%s)", async (reason) => {
        const { recovery, scheduleFetch, scheduleRestart } = createRecovery();

        await expect(recovery.handleReplicationFailure(failure(reason))).resolves.toBe(false);

        expect(scheduleFetch).toHaveBeenCalledOnce();
        expect(scheduleRestart).toHaveBeenCalledOnce();
    });

    it("also recovers after a sync the user started", async () => {
        const { recovery, scheduleFetch } = createRecovery();
        await recovery.handleReplicationFailure(
            failure(CENTRAL_COMPATIBILITY_REJECTION_REASONS.NODE_LOCKED, USER_INITIATED_REPLICATION_AUTHORITY)
        );
        expect(scheduleFetch).toHaveBeenCalledOnce();
    });

    it("does not download again in a loop", async () => {
        const { recovery, scheduleFetch, advance } = createRecovery();
        const locked = failure(CENTRAL_COMPATIBILITY_REJECTION_REASONS.NODE_LOCKED);

        await recovery.handleReplicationFailure(locked);
        advance(AUTOMATIC_FETCH_INTERVAL_MS - 1);
        await recovery.handleReplicationFailure(locked);
        expect(scheduleFetch).toHaveBeenCalledOnce();

        advance(1);
        await recovery.handleReplicationFailure(locked);
        expect(scheduleFetch).toHaveBeenCalledTimes(2);
    });

    it("ignores other failures", async () => {
        const { recovery, scheduleFetch, scheduleRestart } = createRecovery();
        await recovery.handleReplicationFailure(failure(undefined));
        await recovery.handleReplicationFailure(failure(CENTRAL_COMPATIBILITY_REJECTION_REASONS.INCOMPATIBLE_VERSION));
        expect(scheduleFetch).not.toHaveBeenCalled();
        expect(scheduleRestart).not.toHaveBeenCalled();
    });
});
