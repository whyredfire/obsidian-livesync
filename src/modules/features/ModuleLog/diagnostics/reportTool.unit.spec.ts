import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@vrtmrz/livesync-commonlib/settings";
import type { LiveSyncBaseCore } from "@/LiveSyncBaseCore";
import { generateReport } from "./reportTool";

vi.mock("@vrtmrz/livesync-commonlib/compat/common/coreEnvFunctions", () => ({
    compatGlobal: { origin: "test", navigator: { userAgent: "test" } },
}));

const core = { services: { vault: { isStorageInsensitive: () => false } } } as unknown as LiveSyncBaseCore;

describe("diagnostic reports", () => {
    it("redacts the derived ID key and its encrypted local wrapper", async () => {
        const key = "f3205cc41d24116d8c2484993c9d9a2e667373af338ba02f2ee71199adb82f2e";
        const wrapper = "encrypted-id-key-test-wrapper";
        const settings = {
            ...DEFAULT_SETTINGS,
            idDerivationVersion: 1 as const,
            idDerivationKey: key,
            encryptedIdDerivationKey: wrapper,
        };
        const text = JSON.stringify(await generateReport(settings, core));
        expect(text).not.toContain(key);
        expect(text).not.toContain(wrapper);
    });

    it("redacts R2 credentials and omits settings which do not apply to Red Sync", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            endpoint: "https://account-id.r2.cloudflarestorage.com",
            accessKey: "access-key-id",
            secretKey: "secret-access-key",
            bucket: "private-bucket",
            passphrase: "e2ee-passphrase",
        };
        const report = await generateReport(settings, core);
        const text = JSON.stringify(report);
        for (const secret of [
            "access-key-id",
            "secret-access-key",
            "private-bucket",
            "e2ee-passphrase",
            "account-id",
        ]) {
            expect(text).not.toContain(secret);
        }
        expect(report.pluginConfig.endpoint).toBe("R2((HTTPS))");
        expect(Object.keys(report.pluginConfig).some((key) => /^(couchDB_|P2P_|jwt)/.test(key))).toBe(false);
    });
});
