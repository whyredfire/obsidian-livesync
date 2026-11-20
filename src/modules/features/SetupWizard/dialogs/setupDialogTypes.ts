import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/models/setting.type";
import type { SetupFormValues, SetupMode } from "@/serviceFeatures/setupObsidian/setupForm";

export const TYPE_CANCELLED = "cancelled";

export type UseSetupURIResultType = typeof TYPE_CANCELLED | ObsidianLiveSyncSettings;

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

// Setup URI
export type CreatedSetupURI = {
    uri: string;
    /** When the link stops working, or null when it has no time limit. */
    expires: string | null;
};
export type CopySetupURIResultType = typeof TYPE_CANCELLED | "done";
export type CopySetupURIInitialData = {
    /** The end of the current time-bound window, or null when this device's clock is not valid. */
    expires: string | null;
    create(passphrase: string, timeBound: boolean): Promise<CreatedSetupURI>;
};

// Setup QR code
export type ShowSetupQRResultType = typeof TYPE_CANCELLED | "done";
export type ShowSetupQRInitialData = {
    /** One SVG image, or several when the settings are split across codes. */
    parts: string[];
};
