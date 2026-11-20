import { LOG_LEVEL_VERBOSE } from "octagonal-wheels/common/logger";
import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { createInstanceLogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import {
    NO_INTERACTION,
    type ReplicationOutcome,
    type UnattendedOneShotRequest,
} from "@vrtmrz/livesync-commonlib/replication";
import { EVENT_SETTING_SAVED } from "@/common/events";
import { periodicSyncIntervalMs } from "@/common/core/settings/newVaultSettings";

type ReplicationSchedulingSettings = Pick<
    ObsidianLiveSyncSettings,
    "isConfigured" | "syncOnStart" | "syncOnFileOpen" | "syncOnSave" | "periodicReplicationInterval"
>;

/** Timer operations required by the periodic synchronisation. */
export interface ReplicationSchedulingTimer {
    enable(intervalMs: number, tick: () => void): void;
    disable(): void;
}

interface ReplicationSchedulingDependencies {
    isReady(): boolean;
    isSuspended(): boolean;
    currentSettings(): ReplicationSchedulingSettings;
    replicateUnattended(request: UnattendedOneShotRequest): Promise<ReplicationOutcome>;
    timer: ReplicationSchedulingTimer;
    log(error: unknown): void;
}

interface ReplicationSchedulingState {
    /** The interval the timer currently runs at, or undefined while it is stopped. */
    periodicIntervalMs: number | undefined;
    periodicRunning: boolean;
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
            periodicIntervalMs: undefined,
            periodicRunning: false,
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

function periodicIntervalFor(context: ReplicationSchedulingContext): number | undefined {
    const { dependencies, state } = context;
    if (!state.lifecycleAllowsScheduling || !dependencies.isReady() || dependencies.isSuspended()) return undefined;
    const settings = dependencies.currentSettings();
    if (!settings.isConfigured) return undefined;
    return periodicSyncIntervalMs(settings);
}

/** Start, restart, or stop the periodic timer so that it matches the current settings and lifecycle. */
export function reconcilePeriodicReplication(context: ReplicationSchedulingContext): void {
    const { dependencies, state } = context;
    const intervalMs = periodicIntervalFor(context);
    if (intervalMs === state.periodicIntervalMs) return;
    state.periodicIntervalMs = intervalMs;
    if (intervalMs === undefined) {
        dependencies.timer.disable();
        return;
    }
    dependencies.timer.enable(intervalMs, () => {
        void runPeriodicReplication(context);
    });
}

/** Run one periodic synchronisation, unless one is still running or it is no longer allowed. */
export async function runPeriodicReplication(context: ReplicationSchedulingContext): Promise<void> {
    const { dependencies, state } = context;
    // A cleared interval does not retract a callback which is already queued.
    if (state.periodicRunning || periodicIntervalFor(context) === undefined) return;
    state.periodicRunning = true;
    try {
        await dependencies.replicateUnattended({ trigger: "periodic", interaction: NO_INTERACTION });
    } catch (error) {
        dependencies.log(error);
    } finally {
        state.periodicRunning = false;
    }
}

/** Run the start-up synchronisation after the application has resumed, and start the periodic timer. */
export function resumeReplicationScheduling(context: ReplicationSchedulingContext): void {
    const { state } = context;
    if (!state.lifecycleAllowsScheduling) {
        state.lifecycleGeneration += 1;
    }
    state.lifecycleAllowsScheduling = true;
    scheduleAfterResume(context);
    reconcilePeriodicReplication(context);
}

/** Stop scheduling new work before the application suspends or unloads. */
export function suspendReplicationScheduling(context: ReplicationSchedulingContext): void {
    context.state.lifecycleAllowsScheduling = false;
    context.state.queuedResumeGeneration = undefined;
    reconcilePeriodicReplication(context);
}

type ReplicationSchedulingHost = NecessaryServices<
    "API" | "appLifecycle" | "context" | "replication" | "setting",
    never
>;

/** A timer on the host API, which Obsidian clears when the plug-in unloads. */
function createIntervalTimer(api: ReplicationSchedulingHost["services"]["API"]): ReplicationSchedulingTimer {
    let timerId: number | undefined;
    const disable = () => {
        if (timerId === undefined) return;
        api.clearInterval(timerId);
        timerId = undefined;
    };
    return {
        enable(intervalMs, tick) {
            disable();
            timerId = api.setInterval(tick, intervalMs);
        },
        disable,
    };
}

/**
 * Bind scheduled synchronisation to the host lifecycle.
 *
 * Object Storage has no continuous replication. Scheduled work is the unattended
 * OneShot on resume when 'sync on start' is enabled, and the periodic OneShot
 * every 'Sync every' seconds while automatic sync is on.
 */
export function useReplicationScheduling(host: ReplicationSchedulingHost): void {
    const services = host.services;
    const log = createInstanceLogFunction("SF:ReplicationScheduling", services.API);
    const context = createReplicationSchedulingContext({
        isReady: () => services.appLifecycle.isReady(),
        isSuspended: () => services.appLifecycle.isSuspended(),
        currentSettings: () => services.setting.currentSettings(),
        replicateUnattended: (request) => services.replication.replicateUnattended(request),
        timer: createIntervalTimer(services.API),
        log: (error) => log(error, LOG_LEVEL_VERBOSE),
    });
    services.context.events.onEvent(EVENT_SETTING_SAVED, () => {
        reconcilePeriodicReplication(context);
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
