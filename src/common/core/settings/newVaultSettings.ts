import { createNewVaultSettings as createCommonlibNewVaultSettings } from "@vrtmrz/livesync-commonlib/settings";
import {
    PREFERRED_JOURNAL_SYNC,
    REMOTE_MINIO,
    type BucketSyncSetting,
    type ObsidianLiveSyncSettings,
} from "@vrtmrz/livesync-commonlib/compat/common/types";

/**
 * Connection options which are fixed for Cloudflare R2 and therefore not shown
 * in the user interface.
 *
 * - R2 accepts the region `auto` and path-style addressing on the account endpoint.
 * - Requests are sent through Obsidian's request API, so the bucket does not
 *   need a CORS policy.
 */
export const R2_FIXED_OPTIONS = {
    region: "auto",
    forcePathStyle: true,
    useCustomRequestHandler: true,
    bucketCustomHeaders: "",
} as const satisfies Partial<BucketSyncSetting>;

/**
 * The automatic synchronisation triggers which the 'Automatic sync' toggle
 * switches together. Object Storage does not support continuous replication, so
 * synchronisation runs on events: at start-up, when a file is opened, and after
 * local changes have been saved.
 *
 * Fetch and Rebuild switch these off while they run; they stay off until the
 * user turns automatic sync on again.
 */
export const RED_SYNC_SYNC_TRIGGERS = {
    syncOnStart: true,
    syncOnFileOpen: true,
    syncOnSave: true,
    syncAfterMerge: true,
} as const satisfies Partial<ObsidianLiveSyncSettings>;

/** The same triggers, all switched off. */
export const RED_SYNC_SYNC_TRIGGERS_OFF = {
    syncOnStart: false,
    syncOnFileOpen: false,
    syncOnSave: false,
    syncAfterMerge: false,
} as const satisfies Partial<ObsidianLiveSyncSettings>;

/** Whether automatic synchronisation is currently switched on. */
export function isAutomaticSyncEnabled(settings: Partial<ObsidianLiveSyncSettings>): boolean {
    return !!(settings.syncOnStart || settings.syncOnFileOpen || settings.syncOnSave);
}

/** The shortest accepted 'Sync every' interval, in seconds. */
export const MINIMUM_PERIODIC_SYNC_SECONDS = 10;

/** The 'Sync every' interval for new vaults, in seconds. */
export const DEFAULT_PERIODIC_SYNC_SECONDS = 60;

/** Whether a 'Sync every' value is acceptable: 0 (off) or a whole number of at least the minimum. */
export function isValidPeriodicSyncSeconds(seconds: number): boolean {
    return Number.isInteger(seconds) && (seconds === 0 || seconds >= MINIMUM_PERIODIC_SYNC_SECONDS);
}

/**
 * The periodic synchronisation interval in milliseconds, or undefined when it is off.
 *
 * Red Sync runs its own periodic timer from `periodicReplicationInterval` (0 means off)
 * and only while automatic sync is on, so that Fetch and Rebuild stop it as well.
 * The commonlib `periodicReplication` flag is not used.
 */
export function periodicSyncIntervalMs(
    settings: Pick<
        ObsidianLiveSyncSettings,
        "syncOnStart" | "syncOnFileOpen" | "syncOnSave" | "periodicReplicationInterval"
    >
): number | undefined {
    if (!isAutomaticSyncEnabled(settings)) return undefined;
    const seconds = Number(settings.periodicReplicationInterval);
    if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
    return Math.max(MINIMUM_PERIODIC_SYNC_SECONDS, Math.round(seconds)) * 1000;
}

/** Settings which Red Sync always enforces, regardless of what was saved or imported. */
export const RED_SYNC_ENFORCED_SETTINGS = {
    ...R2_FIXED_OPTIONS,
    remoteType: REMOTE_MINIO,
    // Object Storage does not support LiveSync mode. Periodic synchronisation is run by
    // Red Sync's own timer (see periodicSyncIntervalMs), not by this commonlib flag.
    liveSync: false,
    periodicReplication: false,
    syncOnEditorSave: false,
    // Group rapid edits, so that a save-triggered synchronisation uploads one Journal
    // a few seconds after typing stops instead of one for every auto-save.
    batchSave: true,
    batchSaveMinimumDelay: 5,
    batchSaveMaximumDelay: 60,
    // Features which are not part of Red Sync.
    syncInternalFiles: false,
    usePluginSync: false,
    autoSweepPlugins: false,
    autoSweepPluginsPeriodic: false,
    P2P_Enabled: false,
    P2P_AutoStart: false,
    P2P_AutoBroadcast: false,
    settingSyncFile: "",
    // Property encryption applies only to CouchDB and Hidden File Sync.
    encryptInternalMetadata: false,
} as const satisfies Partial<ObsidianLiveSyncSettings>;

/** Create settings for a new Red Sync environment. */
export function createNewVaultSettings(): ObsidianLiveSyncSettings {
    return {
        ...createCommonlibNewVaultSettings(),
        ...PREFERRED_JOURNAL_SYNC,
        ...RED_SYNC_ENFORCED_SETTINGS,
        ...RED_SYNC_SYNC_TRIGGERS,
        encrypt: false,
        usePathObfuscation: false,
        // No bucket size warning (unlimited) unless configured.
        notifyThresholdOfRemoteStorageSize: 0,
        periodicReplicationInterval: DEFAULT_PERIODIC_SYNC_SECONDS,
        pathNormalizationVersion: 1,
    };
}
