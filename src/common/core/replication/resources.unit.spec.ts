import { beforeEach, describe, expect, it, vi } from "vitest";
import { REMOTE_COUCHDB, REMOTE_MINIO } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { createNewVaultSettings } from "@vrtmrz/livesync-commonlib/settings";

const mocks = vi.hoisted(() => ({
    logger: vi.fn(),
    initialFetchFastForwardResource: undefined as unknown,
    couchDB: [] as Array<{
        host: unknown;
        isMobile: ReturnType<typeof vi.fn>;
        connectRemoteCouchDBWithSetting: ReturnType<typeof vi.fn>;
        getRemoteStatus: ReturnType<typeof vi.fn>;
        getRemotePreferredTweakValues: ReturnType<typeof vi.fn>;
        getReplicationPBKDF2Salt: ReturnType<typeof vi.fn>;
        getJoinedDevices: ReturnType<typeof vi.fn>;
        forgetJoinedDevice: ReturnType<typeof vi.fn>;
        createInitialFetchFastForwardResource: ReturnType<typeof vi.fn>;
        closeReplication: ReturnType<typeof vi.fn>;
    }>,
    objectStorage: [] as Array<{
        host: unknown;
        tryConnectRemote: ReturnType<typeof vi.fn>;
        inspectRemotePathIdentity: ReturnType<typeof vi.fn>;
        getRemoteStatus: ReturnType<typeof vi.fn>;
        getRemotePreferredTweakValues: ReturnType<typeof vi.fn>;
        getReplicationPBKDF2Salt: ReturnType<typeof vi.fn>;
        getJoinedDevices: ReturnType<typeof vi.fn>;
        forgetJoinedDevice: ReturnType<typeof vi.fn>;
        closeReplication: ReturnType<typeof vi.fn>;
    }>,
    checkSyncInfo: vi.fn(async () => true),
}));

vi.mock("@vrtmrz/livesync-commonlib/compat/common/logger", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@vrtmrz/livesync-commonlib/compat/common/logger")>();
    return { ...actual, Logger: mocks.logger };
});

vi.mock("@vrtmrz/livesync-commonlib/compat/pouchdb/negotiation", () => ({
    checkSyncInfo: mocks.checkSyncInfo,
}));

vi.mock("@vrtmrz/livesync-commonlib/compat/replication/couchdb/LiveSyncReplicator", () => ({
    LiveSyncCouchDBReplicator: class {
        host: unknown;
        isMobile = vi.fn(() => false);
        connectRemoteCouchDBWithSetting = vi.fn();
        getRemoteStatus = vi.fn();
        getRemotePreferredTweakValues = vi.fn();
        getReplicationPBKDF2Salt = vi.fn();
        getJoinedDevices = vi.fn();
        forgetJoinedDevice = vi.fn();
        createInitialFetchFastForwardResource = vi.fn(() => mocks.initialFetchFastForwardResource);
        closeReplication = vi.fn();

        constructor(host: unknown) {
            this.host = host;
            mocks.couchDB.push(this);
        }
    },
}));

vi.mock("@vrtmrz/livesync-commonlib/compat/replication/journal/LiveSyncJournalReplicator", () => ({
    LiveSyncJournalReplicator: class {
        host: unknown;
        tryConnectRemote = vi.fn();
        inspectRemotePathIdentity = vi.fn();
        getRemoteStatus = vi.fn();
        getRemotePreferredTweakValues = vi.fn();
        getReplicationPBKDF2Salt = vi.fn();
        getJoinedDevices = vi.fn();
        forgetJoinedDevice = vi.fn();
        closeReplication = vi.fn();

        constructor(host: unknown) {
            this.host = host;
            mocks.objectStorage.push(this);
        }
    },
}));

import { createObjectStorageConnectionProbeFactory, createObjectStoragePreferredTweakProbeFactory } from "./resources";

function createSettings(overrides: Partial<ObsidianLiveSyncSettings> = {}): ObsidianLiveSyncSettings {
    return Object.assign(createNewVaultSettings(), {
        remoteType: REMOTE_COUCHDB,
        couchDB_URI: "https://couch.example.test",
        couchDB_DBNAME: "vault",
        endpoint: "https://objects.example.test",
        bucket: "vault",
        ...overrides,
    });
}

describe("replicator probe factories", () => {
    beforeEach(() => {
        mocks.couchDB.length = 0;
        mocks.objectStorage.length = 0;
        mocks.initialFetchFastForwardResource = undefined;
        mocks.checkSyncInfo.mockReset().mockResolvedValue(true);
        mocks.logger.mockClear();
    });

    it("delegates Journal identity inspection to the owned settings snapshot", async () => {
        const source = createSettings();
        const snapshot = { ...source };
        const probe = await createObjectStorageConnectionProbeFactory({} as never)(source);
        const replicator = mocks.objectStorage[0];
        replicator.inspectRemotePathIdentity.mockResolvedValue({ status: "empty" });
        source.bucket = "changed";
        await expect(probe.inspectPathIdentity!()).resolves.toEqual({ status: "empty" });
        expect(replicator.inspectRemotePathIdentity).toHaveBeenCalledWith(snapshot);
        expect(replicator.tryConnectRemote).not.toHaveBeenCalled();
        expect(replicator.getReplicationPBKDF2Salt).not.toHaveBeenCalled();
        await probe.dispose();
        expect(replicator.closeReplication).toHaveBeenCalledOnce();
    });

    it("creates an unpublished Object Storage replicator for each probe and normalises connection results", async () => {
        const host = { name: "host" };
        const source = createSettings({ remoteType: REMOTE_MINIO });
        const snapshot = { ...source };
        const factory = createObjectStorageConnectionProbeFactory(host as never);
        const firstProbe = await factory(source);
        const secondProbe = await factory(source);
        expect(mocks.objectStorage).toHaveLength(2);

        const firstReplicator = mocks.objectStorage[0];
        firstReplicator.tryConnectRemote.mockResolvedValue(true);
        source.endpoint = "https://changed.example.test";
        expect(await firstProbe.check()).toEqual({ ok: true });
        expect(firstReplicator.tryConnectRemote).toHaveBeenCalledWith(snapshot, false);

        const secondReplicator = mocks.objectStorage[1];
        secondReplicator.tryConnectRemote.mockResolvedValue(false);
        expect(await secondProbe.check({ showResult: true })).toEqual({ ok: false });
        expect(secondReplicator.tryConnectRemote).toHaveBeenCalledWith(snapshot, true);

        const error = new Error("storage offline");
        secondReplicator.tryConnectRemote.mockRejectedValue(error);
        expect(await secondProbe.check()).toEqual({ ok: false, reason: error });
    });

    it("delegates Object Storage status and preferred-tweak reads to the trial snapshot", async () => {
        const source = createSettings({ remoteType: REMOTE_MINIO });
        const snapshot = { ...source };
        const connectionProbe = await createObjectStorageConnectionProbeFactory({} as never)(source);
        const preferredProbe = await createObjectStoragePreferredTweakProbeFactory({} as never)(source);
        const connectionReplicator = mocks.objectStorage[0];
        const preferredReplicator = mocks.objectStorage[1];
        const status = { estimatedSize: 42 };
        const preferred = { status: "unsupported" } as const;
        connectionReplicator.getRemoteStatus.mockResolvedValue(status);
        preferredReplicator.getRemotePreferredTweakValues.mockResolvedValue(preferred);

        source.bucket = "changed-vault";
        expect(await connectionProbe.getStatus()).toBe(status);
        expect(await preferredProbe.read()).toBe(preferred);
        expect(connectionReplicator.getRemoteStatus).toHaveBeenCalledWith(snapshot);
        expect(preferredReplicator.getRemotePreferredTweakValues).toHaveBeenCalledWith(snapshot);
    });

    it("shares a rejected disposal promise and never retries closeReplication", async () => {
        const probe = await createObjectStorageConnectionProbeFactory({} as never)(
            createSettings({ remoteType: REMOTE_MINIO })
        );
        const replicator = mocks.objectStorage[0];
        const failure = new Error("close failed");
        replicator.closeReplication.mockImplementation(() => {
            throw failure;
        });

        const disposal = probe.dispose();
        expect(probe.dispose()).toBe(disposal);
        await expect(disposal).rejects.toBe(failure);
        expect(replicator.closeReplication).toHaveBeenCalledOnce();
    });
});
