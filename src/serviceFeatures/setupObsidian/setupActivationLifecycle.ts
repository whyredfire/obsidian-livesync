export type SetupInitialisationMode = "fetch" | "rebuild";

export interface SetupInitialisationScheduler {
    scheduleFetch(prepareBeforeRestart?: () => Promise<void>): Promise<boolean>;
    scheduleRebuild(prepareBeforeRestart?: () => Promise<void>): Promise<boolean>;
}

/**
 * Reserves the next-start initialisation operation before enabling settings.
 * The scheduler owns suspension, rollback, and restart ordering.
 */
export function applySettingsWithScheduledInitialisation(
    scheduler: SetupInitialisationScheduler,
    mode: SetupInitialisationMode,
    applySettings: () => Promise<void>
): Promise<boolean> {
    return mode === "fetch" ? scheduler.scheduleFetch(applySettings) : scheduler.scheduleRebuild(applySettings);
}
