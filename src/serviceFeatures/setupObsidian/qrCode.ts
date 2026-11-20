import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import {
    encodeQR,
    encodeSettingsToQRCodeData,
    OutputFormat,
} from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { EVENT_REQUEST_SHOW_SETUP_QR } from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import { fireAndForget } from "@vrtmrz/livesync-commonlib/compat/common/utils";
import type { SetupFeatureHost } from "./types";
import ShowSetupQR from "@/modules/features/SetupWizard/dialogs/ShowSetupQR.svelte";
import type {
    ShowSetupQRInitialData,
    ShowSetupQRResultType,
} from "@/modules/features/SetupWizard/dialogs/setupDialogTypes";

/** Show the current settings as a QR code (or several) which another device can scan to join this sync. */
export async function encodeSetupSettingsAsQR(host: SetupFeatureHost) {
    const settings = host.services.setting.currentSettings();
    const settingString = encodeSettingsToQRCodeData(settings);
    const result = encodeQR(settingString, OutputFormat.SVG);
    if (result === "") {
        return "";
    }
    const parts = typeof result === "string" ? [result] : result.parts;
    await host.services.UI.dialogManager.openWithExplicitCancel<ShowSetupQRResultType, ShowSetupQRInitialData>(
        ShowSetupQR,
        { parts }
    );
    // The first image is returned for compatibility with callers which expect one.
    return parts[0];
}

export function useSetupQRCodeFeature(host: NecessaryServices<"API" | "UI" | "setting" | "appLifecycle", never>) {
    host.services.appLifecycle.onLoaded.addHandler(() => {
        host.services.API.addCommand({
            id: "livesync-setting-qr",
            name: "Show settings as a QR code",
            checkCallback: (checking) => {
                if (!host.services.setting.currentSettings().isConfigured) return false;
                if (!checking) fireAndForget(encodeSetupSettingsAsQR(host));
                return true;
            },
        });
        host.services.context.events.onEvent(EVENT_REQUEST_SHOW_SETUP_QR, () =>
            fireAndForget(() => encodeSetupSettingsAsQR(host))
        );
        return Promise.resolve(true);
    });
}
