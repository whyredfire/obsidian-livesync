import { describe, expect, it } from "vitest";
import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { createNewVaultSettings } from "@vrtmrz/livesync-commonlib/settings";
import { getObjectStorageReplicatorConfigurationIdentity } from "./configurationIdentity";

describe("active Replicator configuration identity", () => {
    function configuredSettings(overrides: Partial<ObsidianLiveSyncSettings> = {}): ObsidianLiveSyncSettings {
        return Object.assign(createNewVaultSettings(), {
            activeConfigurationId: "profile-a",
            couchDB_URI: "https://couch.example.test/base",
            couchDB_USER: "alice",
            couchDB_PASSWORD: "secret-a",
            couchDB_DBNAME: "vault",
            couchDB_CustomHeaders: "X-Second: two\nX-First: one",
            endpoint: "https://objects.example.test/base",
            accessKey: "alice",
            secretKey: "secret-a",
            bucket: "vault",
            bucketPrefix: "notes/",
            region: "auto",
            bucketCustomHeaders: "X-Second: two\nX-First: one",
            encrypt: true,
            passphrase: "encryption-a",
            useDynamicIterationCount: false,
            permitEmptyPassphrase: false,
            enableCompression: false,
            ...overrides,
        });
    }

    it.each([
        ["endpoint", "https://other.example.test/base"],
        ["bucket", "other-vault"],
        ["bucketPrefix", "archive/"],
        ["region", "eu-west-1"],
        ["accessKey", "bob"],
        ["secretKey", "secret-b"],
        ["forcePathStyle", false],
        ["useCustomRequestHandler", true],
        ["bucketCustomHeaders", "X-First: changed"],
        ["encrypt", false],
        ["passphrase", "encryption-b"],
        ["useDynamicIterationCount", true],
        ["E2EEAlgorithm", ""],
        ["permitEmptyPassphrase", true],
    ] satisfies Array<[keyof ObsidianLiveSyncSettings, ObsidianLiveSyncSettings[keyof ObsidianLiveSyncSettings]]>)(
        "detects an Object Storage %s change",
        (key, value) => {
            const settings = configuredSettings();
            expect(getObjectStorageReplicatorConfigurationIdentity({ ...settings, [key]: value })).not.toBe(
                getObjectStorageReplicatorConfigurationIdentity(settings)
            );
        }
    );
});
