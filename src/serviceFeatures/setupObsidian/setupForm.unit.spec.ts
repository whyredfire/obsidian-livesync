import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, REMOTE_MINIO } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { buildSetupSettings, emptySetupFormValues, validateSetupForm, type SetupFormValues } from "./setupForm";

function values(overrides: Partial<SetupFormValues> = {}): SetupFormValues {
    return {
        ...emptySetupFormValues(),
        endpoint: "https://account.r2.cloudflarestorage.com/",
        accessKey: " access ",
        secretKey: "secret",
        bucket: "notes",
        ...overrides,
    };
}

describe("setup form", () => {
    it("accepts a complete form", () => {
        expect(validateSetupForm(values(), "new", "")).toBeUndefined();
    });

    it.each([
        [{ endpoint: "" }, "endpoint"],
        [{ endpoint: "account.r2.cloudflarestorage.com" }, "https://"],
        [{ accessKey: " " }, "Access Key ID"],
        [{ secretKey: "" }, "Secret Access Key"],
        [{ bucket: "" }, "bucket"],
        [{ sizeWarning: -1 }, "size warning"],
        [{ encrypt: true, passphrase: "" }, "passphrase"],
    ])("reports the first problem: %j", (overrides, expected) => {
        expect(validateSetupForm(values(overrides), "join", "")).toContain(expected);
    });

    it("requires matching passphrases only when starting a new sync", () => {
        const encrypted = values({ encrypt: true, passphrase: "secret phrase" });
        expect(validateSetupForm(encrypted, "new", "other")).toBe("The passphrases do not match.");
        expect(validateSetupForm(encrypted, "new", "secret phrase")).toBeUndefined();
        expect(validateSetupForm(encrypted, "join", "")).toBeUndefined();
    });

    it("builds R2 settings with fixed options and trimmed values", async () => {
        const settings = await buildSetupSettings({ ...DEFAULT_SETTINGS }, values({ sizeWarning: 500 }));
        expect(settings).toMatchObject({
            remoteType: REMOTE_MINIO,
            endpoint: "https://account.r2.cloudflarestorage.com",
            accessKey: "access",
            bucket: "notes",
            region: "auto",
            forcePathStyle: true,
            useCustomRequestHandler: true,
            notifyThresholdOfRemoteStorageSize: 500,
            encrypt: false,
            passphrase: "",
            usePathObfuscation: false,
        });
    });

    it("derives the same ID key from the same passphrase", async () => {
        const encrypted = values({ encrypt: true, passphrase: "secret phrase" });
        const first = await buildSetupSettings({ ...DEFAULT_SETTINGS }, encrypted);
        const second = await buildSetupSettings({ ...DEFAULT_SETTINGS }, encrypted);
        expect(first.idDerivationKey).toMatch(/^[0-9a-f]{64}$/);
        expect(first.idDerivationKey).toBe(second.idDerivationKey);
        expect(first).toMatchObject({ encrypt: true, passphrase: "secret phrase", usePathObfuscation: true });
    });
});
