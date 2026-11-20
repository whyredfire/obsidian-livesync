import {
    PREFERRED_JOURNAL_SYNC,
    REMOTE_MINIO,
    type ObsidianLiveSyncSettings,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { deriveIdKey, ID_DERIVATION_VERSION } from "@vrtmrz/livesync-commonlib/settings";
import { R2_FIXED_OPTIONS } from "@/common/core/settings/newVaultSettings";

/** Whether this device starts a new sync (uploads) or joins an existing one (downloads). */
export type SetupMode = "new" | "join";

/** Everything the single setup form asks for. */
export type SetupFormValues = {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    bucketPrefix: string;
    /** Megabytes; 0 means no warning. */
    sizeWarning: number;
    encrypt: boolean;
    passphrase: string;
    usePathObfuscation: boolean;
};

/** The form values for an existing connection, so that "Change" starts from what is configured. */
export function setupFormValuesFrom(settings: ObsidianLiveSyncSettings): SetupFormValues {
    return {
        endpoint: settings.endpoint ?? "",
        accessKey: settings.accessKey ?? "",
        secretKey: settings.secretKey ?? "",
        bucket: settings.bucket ?? "",
        bucketPrefix: settings.bucketPrefix ?? "",
        sizeWarning: Math.max(0, settings.notifyThresholdOfRemoteStorageSize ?? 0),
        encrypt: !!settings.encrypt,
        passphrase: settings.encrypt ? (settings.passphrase ?? "") : "",
        usePathObfuscation: settings.encrypt ? !!settings.usePathObfuscation : true,
    };
}

export function emptySetupFormValues(): SetupFormValues {
    return {
        endpoint: "",
        accessKey: "",
        secretKey: "",
        bucket: "",
        bucketPrefix: "",
        sizeWarning: 0,
        encrypt: false,
        passphrase: "",
        usePathObfuscation: true,
    };
}

/** Return a message describing the first problem with the form, or undefined when it is complete. */
export function validateSetupForm(
    values: SetupFormValues,
    mode: SetupMode,
    confirmPassphrase: string
): string | undefined {
    const endpoint = values.endpoint.trim();
    if (!endpoint) return "Enter the endpoint URL.";
    if (!/^https?:\/\/\S+$/i.test(endpoint)) return "The endpoint URL must start with https://.";
    if (!values.accessKey.trim()) return "Enter the Access Key ID.";
    if (!values.secretKey.trim()) return "Enter the Secret Access Key.";
    if (!values.bucket.trim()) return "Enter the bucket name.";
    if (!Number.isInteger(values.sizeWarning) || values.sizeWarning < 0) {
        return "The size warning must be a whole number of megabytes (0 for no warning).";
    }
    if (values.encrypt) {
        if (!values.passphrase) return "Enter an encryption passphrase.";
        if (mode === "new" && values.passphrase !== confirmPassphrase) return "The passphrases do not match.";
    }
    return undefined;
}

/** Build complete Red Sync settings from the form on top of the given base settings. */
export async function buildSetupSettings(
    base: ObsidianLiveSyncSettings,
    values: SetupFormValues
): Promise<ObsidianLiveSyncSettings> {
    const settings: ObsidianLiveSyncSettings = {
        ...base,
        ...PREFERRED_JOURNAL_SYNC,
        ...R2_FIXED_OPTIONS,
        remoteType: REMOTE_MINIO,
        endpoint: values.endpoint.trim().replace(/\/+$/, ""),
        accessKey: values.accessKey.trim(),
        secretKey: values.secretKey.trim(),
        bucket: values.bucket.trim(),
        bucketPrefix: values.bucketPrefix.trim(),
        notifyThresholdOfRemoteStorageSize: values.sizeWarning,
        encrypt: values.encrypt,
        passphrase: values.encrypt ? values.passphrase : "",
        usePathObfuscation: values.encrypt && values.usePathObfuscation,
    };
    if (values.encrypt) {
        // Derived from the passphrase so that every device configured with it produces the same IDs.
        settings.idDerivationKey = await deriveIdKey(values.passphrase);
        settings.idDerivationVersion = ID_DERIVATION_VERSION;
    }
    return settings;
}
