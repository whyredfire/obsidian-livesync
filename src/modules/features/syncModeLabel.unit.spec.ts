import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { projectSyncModeLabel } from "./syncModeLabel.ts";

function settings(overrides: Partial<ObsidianLiveSyncSettings> = {}): ObsidianLiveSyncSettings {
    return {
        ...DEFAULT_SETTINGS,
        isConfigured: true,
        syncOnSave: false,
        syncOnEditorSave: false,
        syncOnStart: false,
        syncOnFileOpen: false,
        syncAfterMerge: false,
        ...overrides,
    };
}

describe("configured synchronisation mode", () => {
    it("identifies manual-only operation when all automatic triggers are disabled", () => {
        expect(projectSyncModeLabel(settings())).toEqual({
            key: "sync-mode",
            text: "🛎",
            title: "Manual synchronisation only. Automatic synchronisation is disabled.",
        });
    });

    it.each(["syncOnSave", "syncOnEditorSave", "syncOnStart", "syncOnFileOpen", "syncAfterMerge"] as const)(
        "counts %s as automatic event synchronisation",
        (key) => {
            expect(projectSyncModeLabel(settings({ [key]: true }))).toMatchObject({
                text: "✨",
                title: "Configured automatic synchronisation: On events.",
            });
        }
    );

    it("shows nothing before the vault is configured", () => {
        expect(projectSyncModeLabel(settings({ isConfigured: false, syncOnSave: true }))).toBeUndefined();
    });
});
