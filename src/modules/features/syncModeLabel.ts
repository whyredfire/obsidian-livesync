import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/settings";
import { $msg } from "@/common/translation";
import type { StatusBarPart } from "./StatusBarRenderer.ts";

type SyncModeSettings = Pick<
    ObsidianLiveSyncSettings,
    "isConfigured" | "syncOnSave" | "syncOnEditorSave" | "syncOnStart" | "syncOnFileOpen" | "syncAfterMerge"
>;

/** Project the status-bar badge which shows whether automatic synchronisation is on. */
export function projectSyncModeLabel(settings: Readonly<SyncModeSettings>): StatusBarPart | undefined {
    if (!settings.isConfigured) return undefined;
    const onEvents =
        settings.syncOnSave ||
        settings.syncOnEditorSave ||
        settings.syncOnStart ||
        settings.syncOnFileOpen ||
        settings.syncAfterMerge;
    return {
        key: "sync-mode",
        text: onEvents ? "✨" : "🛎",
        title: onEvents
            ? $msg("moduleLog.syncMode.configured", { modes: $msg("obsidianLiveSyncSettingTab.optionOnEvents") })
            : $msg("moduleLog.syncMode.manual"),
    };
}
