import { LOG_LEVEL_VERBOSE } from "octagonal-wheels/common/logger";
import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { createInstanceLogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import {
    NO_INTERACTION,
    type ReplicationOutcome,
    type UnattendedOneShotRequest,
} from "@vrtmrz/livesync-commonlib/replication";

type ReplicationSchedulingSettings = Pick<ObsidianLiveSyncSettings, "isConfigured" | "syncOnStart">;

interface ReplicationSchedulingDependencies {
    isReady(): boolean;
    isSuspended(): boolean;
    currentSettings(): ReplicationSchedulingSettings;
    replicateUnattended(request: UnattendedOneShotRequest): Promise<ReplicationOutcome>;
    log(error: unknown): void;
}

interface ReplicationSchedulingState {
    lifecycleAllowsScheduling: boolean;
    lifecycleGeneration: number;
    resumeOperation: Promise<void> | undefined;
    runningResumeGeneration: number | undefined;
    queuedResumeGeneration: number | undefined;
}

/** Private state and collaborators owned by the replication scheduling serviceFeature. */
interface ReplicationSchedulingContext {
    readonly dependencies: ReplicationSchedulingDependencies;
    readonly state: ReplicationSchedulingState;
}

/** Construct the independently testable context owned by the serviceFeature. */
export function createReplicationSchedulingContext(
    dependencies: ReplicationSchedulingDependencies
): ReplicationSchedulingContext {
    return {
        dependencies,
        state: {
            // AppLifecycleService does not expose physical visibility as
            // isSuspended(). Keep the observed state in this private context.
            lifecycleAllowsScheduling: false,
            lifecycleGeneration: 0,
            resumeOperation: undefined,
            runningResumeGeneration: undefined,
            queuedResumeGeneration: undefined,
        },
    };
}

function canRunResume(context: ReplicationSchedulingContext, generation: number): boolean {
    const { dependencies, state } = context;
    return (
        generation === state.lifecycleGeneration &&
        state.lifecycleAllowsScheduling &&
        dependencies.isReady() &&
        !dependencies.isSuspended()
    );
}

async function runAfterResume(context: ReplicationSchedulingContext, generation: number): Promise<void> {
    if (!canRunResume(context, generation)) return;
    const settings = context.dependencies.currentSettings();
    if (!settings.isConfigured || !settings.syncOnStart) return;
    await context.dependencies.replicateUnattended({
        trigger: "resume",
        interaction: NO_INTERACTION,
    });
}

function scheduleAfterResume(context: ReplicationSchedulingContext): void {
    const { dependencies, state } = context;
    const requestedGeneration = state.lifecycleGeneration;
    if (state.resumeOperation) {
        // Duplicate notifications within one generation share the current
        // operation. A later lifecycle generation must run after it.
        if (state.runningResumeGeneration !== requestedGeneration) {
            state.queuedResumeGeneration = requestedGeneration;
        }
        return;
    }
    state.runningResumeGeneration = requestedGeneration;
    state.resumeOperation = runAfterResume(context, requestedGeneration)
        .catch((error: unknown) => {
            dependencies.log(error);
        })
        .finally(() => {
            state.resumeOperation = undefined;
            state.runningResumeGeneration = undefined;
            const queuedGeneration = state.queuedResumeGeneration;
            state.queuedResumeGeneration = undefined;
            if (queuedGeneration === state.lifecycleGeneration && state.lifecycleAllowsScheduling) {
                scheduleAfterResume(context);
            }
        });
}

/** Run the start-up synchronisation after the application has resumed. */
export function resumeReplicationScheduling(context: ReplicationSchedulingContext): void {
    const { state } = context;
    if (!state.lifecycleAllowsScheduling) {
        state.lifecycleGeneration += 1;
    }
    state.lifecycleAllowsScheduling = true;
    scheduleAfterResume(context);
}

/** Stop scheduling new work before the application suspends or unloads. */
export function suspendReplicationScheduling(context: ReplicationSchedulingContext): void {
    context.state.lifecycleAllowsScheduling = false;
    context.state.queuedResumeGeneration = undefined;
}

type ReplicationSchedulingHost = NecessaryServices<"API" | "appLifecycle" | "replication" | "setting", never>;

/**
 * Bind start-up synchronisation to the host lifecycle.
 *
 * Object Storage has no continuous replication, so the only scheduled work is the
 * unattended OneShot which runs on resume when 'sync on start' is enabled.
 */
export function useReplicationScheduling(host: ReplicationSchedulingHost): void {
    const services = host.services;
    const log = createInstanceLogFunction("SF:ReplicationScheduling", services.API);
    const context = createReplicationSchedulingContext({
        isReady: () => services.appLifecycle.isReady(),
        isSuspended: () => services.appLifecycle.isSuspended(),
        currentSettings: () => services.setting.currentSettings(),
        replicateUnattended: (request) => services.replication.replicateUnattended(request),
        log: (error) => log(error, LOG_LEVEL_VERBOSE),
    });
    const stop = () => {
        suspendReplicationScheduling(context);
        return Promise.resolve(true);
    };
    services.appLifecycle.onUnload.addHandler(stop);
    services.appLifecycle.onSuspending.addHandler(stop);
    services.appLifecycle.onResumed.addHandler(() => {
        resumeReplicationScheduling(context);
        return Promise.resolve(true);
    });
}
