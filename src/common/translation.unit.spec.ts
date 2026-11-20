import { describe, expect, it } from "vitest";
import { commonlibEnglishMessages, type CommonlibMessageKey } from "@vrtmrz/livesync-commonlib/context";
import { $msg, $t, translateIfAvailable, translateLiveSyncMessage } from "@/common/translation";
import { englishMessages } from "@/common/messages/en";

describe("English message catalogue", () => {
    it("resolves Red Sync keys to their English text", () => {
        expect($msg("P2P.NoKnownPeers")).toBe(englishMessages["P2P.NoKnownPeers"]);
        expect($msg("Ui.SetupWizard.SelectNew.ManualOptionDesc")).toContain("Cloudflare R2");
    });

    it("substitutes every occurrence of a placeholder", () => {
        expect($msg("Failed to derive the encryption key: ${reason}", { reason: "boom" })).toBe(
            "Failed to derive the encryption key: boom"
        );
    });

    it("resolves Commonlib keys through the Commonlib English catalogue", () => {
        const key = Object.keys(commonlibEnglishMessages)[0] as CommonlibMessageKey;
        expect($t(key)).toBe(commonlibEnglishMessages[key]);
        expect(translateLiveSyncMessage(key)).toBe(commonlibEnglishMessages[key]);
    });

    it("returns plain text unchanged when it is not a key", () => {
        expect(translateIfAvailable("Just some text")).toBe("Just some text");
        expect(translateIfAvailable("")).toBe("");
    });
});
