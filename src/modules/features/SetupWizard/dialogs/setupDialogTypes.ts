import type {
    BucketSyncSetting,
    EncryptionSettings,
    ObsidianLiveSyncSettings,
} from "@vrtmrz/livesync-commonlib/compat/common/models/setting.type";
import type { SetupFormValues, SetupMode } from "@/serviceFeatures/setupObsidian/setupForm";

export const TYPE_IDENTICAL = "identical";
export const TYPE_INDEPENDENT = "independent";
export const TYPE_UNBALANCED = "unbalanced";
export const TYPE_CANCEL = "cancelled";
export const TYPE_CANCELLED = "cancelled";

export const TYPE_BACKUP_DONE = "backup_done";
export const TYPE_BACKUP_SKIPPED = "backup_skipped";
export const TYPE_UNABLE_TO_BACKUP = "unable_to_backup";

// Outro ask user mode
export const TYPE_EXISTING = "existing-user";
export const TYPE_NEW = "new-user";
export const TYPE_COMPATIBLE_EXISTING = "compatible-existing-user";

// OutroExistingUser
export const TYPE_APPLY = "apply";

// Applying pending settings which require database initialisation
export const TYPE_FETCH = "fetch";
export const TYPE_REBUILD = "rebuild";

export type ResultTypeVault =
    | typeof TYPE_IDENTICAL
    | typeof TYPE_INDEPENDENT
    | typeof TYPE_UNBALANCED
    | typeof TYPE_CANCEL;
export type ResultTypeBackup =
    | typeof TYPE_BACKUP_DONE
    | typeof TYPE_BACKUP_SKIPPED
    | typeof TYPE_UNABLE_TO_BACKUP
    | typeof TYPE_CANCEL;

export type ResultTypeExtra = {
    preventFetchingConfig: boolean;
};
export type FetchEverythingResult =
    | {
          vault: ResultTypeVault;
          backup: ResultTypeBackup;
          extra: ResultTypeExtra;
      }
    | typeof TYPE_CANCEL;

export type RebuildEverythingResult =
    | {
          backup: ResultTypeBackup;
          extra: ResultTypeExtra;
      }
    | typeof TYPE_CANCEL;

export type OutroAskUserModeResultType =
    | typeof TYPE_EXISTING
    | typeof TYPE_NEW
    | typeof TYPE_COMPATIBLE_EXISTING
    | typeof TYPE_CANCELLED;

export type OutroExistingUserResultType = typeof TYPE_APPLY | typeof TYPE_CANCELLED;
export type OutroApplyInitialData = {
    enableUnencryptedContent: boolean;
};

export type OutroNewUserResultType = typeof TYPE_APPLY | typeof TYPE_CANCELLED;

export type ApplySettingsInitialisationResultType = typeof TYPE_FETCH | typeof TYPE_REBUILD | typeof TYPE_CANCELLED;

export type UseSetupURIResultType = typeof TYPE_CANCELLED | ObsidianLiveSyncSettings;

export type SetupRemoteE2EEResultType = typeof TYPE_CANCELLED | EncryptionSettings;
export type SetupRemoteE2EEInitialData = {
    settings: EncryptionSettings;
    newVault: boolean;
};

export type SetupRemoteBucketResultType =
    | typeof TYPE_CANCELLED
    | (BucketSyncSetting & Pick<ObsidianLiveSyncSettings, "notifyThresholdOfRemoteStorageSize">);

// Initial setup
export type SetupStartResultType = SetupMode | "uri" | typeof TYPE_CANCELLED;

export type SetupPreparation =
    | { status: "ok"; settings: ObsidianLiveSyncSettings }
    | { status: "confirm"; message: string; confirmLabel: string; settings: ObsidianLiveSyncSettings }
    | { status: "error"; message: string };

export type SetupFormInitialData = {
    mode: SetupMode;
    values: SetupFormValues;
    /** Test the connection and build the settings to apply. */
    prepare(values: SetupFormValues): Promise<SetupPreparation>;
};

export type SetupFormResultType = typeof TYPE_CANCELLED | "back" | { settings: ObsidianLiveSyncSettings };
