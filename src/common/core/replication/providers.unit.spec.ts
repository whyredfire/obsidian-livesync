import { describe, expect, it, vi } from "vitest";
import { REMOTE_COUCHDB, REMOTE_MINIO } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { createNewVaultSettings } from "@vrtmrz/livesync-commonlib/settings";
import {
    CAPABILITY_SUPPORT_KINDS,
    NO_INTERACTION,
    REPLICATION_COMPLETED,
    REPLICATION_PROGRESS_PRESENTATIONS,
    REMOTE_RESOURCE_KINDS,
    USER_INITIATED_REPLICATION_AUTHORITY,
} from "@vrtmrz/livesync-commonlib/replication";

const constructorMocks = vi.hoisted(() => ({
    objectStorage: vi.fn(),
    objectStorageOneShot: vi.fn(async (..._args: unknown[]) => REPLICATION_COMPLETED),
}));

vi.mock("@vrtmrz/livesync-commonlib/compat/replication/journal/LiveSyncJournalReplicator", () => ({
    LiveSyncJournalReplicator: class {
        constructor(host: unknown) {
            constructorMocks.objectStorage(host);
        }
        openOneShotReplicationWithOutcome(...args: unknown[]) {
            return constructorMocks.objectStorageOneShot(...args);
        }
    },
}));

import { createCentralReplicatorProviderDefinitions } from "./providers";

function createStructuralOneShotReplicator() {
    return {
        initializeDatabaseForReplication: vi.fn(async () => true),
        openReplication: vi.fn(async () => true),
        terminateSync: vi.fn(),
        closeReplication: vi.fn(),
        openOneShotReplicationWithOutcome: vi.fn(async () => REPLICATION_COMPLETED),
    };
}

describe("central Replicator provider definitions", () => {
    it("provides Object Storage as the only central provider", async () => {
        const host = {} as Parameters<typeof createCentralReplicatorProviderDefinitions>[0];
        const definitions = createCentralReplicatorProviderDefinitions(host);
        const objectStorage = definitions.get(REMOTE_MINIO)!;

        expect([...definitions.keys()]).toEqual([REMOTE_MINIO]);
        expect(definitions.get(REMOTE_COUCHDB)).toBeUndefined();
        expect(objectStorage.readiness.centralRemotePreparation).toBe("provider-owned");

        await objectStorage.create(createNewVaultSettings());
        expect(constructorMocks.objectStorage).toHaveBeenCalledWith(host);
    });

    it("requires an endpoint and a bucket for the Object Storage remote type", () => {
        const objectStorage = createCentralReplicatorProviderDefinitions({} as never).get(REMOTE_MINIO)!;
        const configured = {
            remoteType: REMOTE_MINIO,
            endpoint: "https://account.r2.cloudflarestorage.com",
            bucket: "vault",
        };

        expect(objectStorage.isConfigured(Object.assign(createNewVaultSettings(), configured))).toBe(true);
        expect(
            objectStorage.isConfigured(Object.assign(createNewVaultSettings(), { ...configured, bucket: " " }))
        ).toBe(false);
        expect(
            objectStorage.isConfigured(Object.assign(createNewVaultSettings(), { ...configured, endpoint: "" }))
        ).toBe(false);
        expect(
            objectStorage.isConfigured(
                Object.assign(createNewVaultSettings(), { ...configured, remoteType: REMOTE_COUCHDB })
            )
        ).toBe(false);
    });

    it("declares the owned resources which apply to Object Storage", () => {
        const definition = createCentralReplicatorProviderDefinitions({} as never).get(REMOTE_MINIO)!;
        const resources = definition.remoteResources;

        expect(Object.keys(resources).sort()).toEqual(Object.values(REMOTE_RESOURCE_KINDS).sort());
        for (const kind of [
            REMOTE_RESOURCE_KINDS.JOINED_DEVICES,
            REMOTE_RESOURCE_KINDS.CONNECTION,
            REMOTE_RESOURCE_KINDS.PREFERRED_TWEAK,
            REMOTE_RESOURCE_KINDS.SECURITY_SEED,
        ]) {
            expect(resources[kind]?.kind).toBe(CAPABILITY_SUPPORT_KINDS.SUPPORTED);
        }
        expect(resources[REMOTE_RESOURCE_KINDS.SYNCHRONISATION_INFORMATION].kind).toBe(
            CAPABILITY_SUPPORT_KINDS.NOT_APPLICABLE
        );
        expect(resources[REMOTE_RESOURCE_KINDS.INITIAL_FETCH_FAST_FORWARD]?.kind).toBe(
            CAPABILITY_SUPPORT_KINDS.NOT_APPLICABLE
        );
        expect(definition.centralRemoteAdministration?.kind).toBe(CAPABILITY_SUPPORT_KINDS.SUPPORTED);
        expect(definition.continuous.kind).toBe(CAPABILITY_SUPPORT_KINDS.NOT_APPLICABLE);
    });

    it("maps progress presentation independently of recovery authority", async () => {
        const definition = createCentralReplicatorProviderDefinitions({} as never).get(REMOTE_MINIO)!;
        if (definition.userInitiatedOneShot.kind !== CAPABILITY_SUPPORT_KINDS.SUPPORTED) {
            throw new Error("Object Storage OneShot is unavailable");
        }
        const setting = Object.assign(createNewVaultSettings(), { remoteType: REMOTE_MINIO });
        const instance = createStructuralOneShotReplicator();

        await definition.userInitiatedOneShot.run(instance, setting, {
            trigger: "manual",
            progressPresentation: REPLICATION_PROGRESS_PRESENTATIONS.QUIET,
            interaction: USER_INITIATED_REPLICATION_AUTHORITY,
        });
        await definition.userInitiatedOneShot.run(instance, setting, {
            trigger: "manual",
            progressPresentation: REPLICATION_PROGRESS_PRESENTATIONS.NOTICE,
            interaction: USER_INITIATED_REPLICATION_AUTHORITY,
        });

        expect(instance.openOneShotReplicationWithOutcome).toHaveBeenNthCalledWith(1, setting, false);
        expect(instance.openOneShotReplicationWithOutcome).toHaveBeenNthCalledWith(2, setting, true);
    });

    it("keeps unattended work quiet and rejects interaction before opening replication", async () => {
        const definition = createCentralReplicatorProviderDefinitions({} as never).get(REMOTE_MINIO)!;
        if (definition.unattendedOneShot.kind !== CAPABILITY_SUPPORT_KINDS.SUPPORTED) {
            throw new Error("Unattended OneShot is unavailable");
        }
        const setting = Object.assign(createNewVaultSettings(), { remoteType: REMOTE_MINIO });
        const instance = createStructuralOneShotReplicator();

        const blocked = await definition.unattendedOneShot.run(instance, setting, {
            trigger: "resume",
            interaction: USER_INITIATED_REPLICATION_AUTHORITY,
        } as never);
        expect(blocked).toEqual({ status: "blocked", reason: "interaction-required" });
        expect(instance.openOneShotReplicationWithOutcome).not.toHaveBeenCalled();

        await expect(
            definition.unattendedOneShot.run(instance, setting, { trigger: "resume", interaction: NO_INTERACTION })
        ).resolves.toBe(REPLICATION_COMPLETED);
        expect(instance.openOneShotReplicationWithOutcome).toHaveBeenCalledExactlyOnceWith(setting, false);
    });

    it("rejects a one-shot adapter whose Replicator does not declare the required operation", async () => {
        const definition = createCentralReplicatorProviderDefinitions({} as never).get(REMOTE_MINIO)!;
        if (definition.userInitiatedOneShot.kind !== CAPABILITY_SUPPORT_KINDS.SUPPORTED) {
            throw new Error("Object Storage OneShot is unavailable");
        }
        const { openOneShotReplicationWithOutcome: _omitted, ...incompleteInstance } =
            createStructuralOneShotReplicator();

        const outcome = await definition.userInitiatedOneShot.run(incompleteInstance, createNewVaultSettings(), {
            trigger: "manual",
            progressPresentation: REPLICATION_PROGRESS_PRESENTATIONS.NOTICE,
            interaction: USER_INITIATED_REPLICATION_AUTHORITY,
        });

        expect(outcome.status).toBe("failed");
        expect(incompleteInstance.openReplication).not.toHaveBeenCalled();
    });
});
