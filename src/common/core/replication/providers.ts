import { REMOTE_MINIO, type RemoteDBSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import {
    CAPABILITY_NOT_APPLICABLE,
    NO_INTERACTION,
    PROVIDER_OWNED_CENTRAL_REMOTE_REPLICATION_READINESS,
    REPLICATION_PROGRESS_PRESENTATIONS,
    REMOTE_RESOURCE_KINDS,
    defineReplicatorProviderDefinitions,
    replicationBlocked,
    replicationFailed,
    supportedStopActiveTransfer,
    supportedCapability,
    type ReplicatorProviderDefinitionMap,
    type ReplicationOutcome,
    type ReplicatorInstance,
    type UserInitiatedOneShotRunner,
    type UnattendedOneShotRunner,
} from "@vrtmrz/livesync-commonlib/replication";
import type { LiveSyncCouchDBReplicatorEnv } from "@vrtmrz/livesync-commonlib/compat/replication/couchdb/LiveSyncReplicator";
import { LiveSyncJournalReplicator } from "@vrtmrz/livesync-commonlib/compat/replication/journal/LiveSyncJournalReplicator";
import { getObjectStorageReplicatorConfigurationIdentity } from "./configurationIdentity";
import {
    createObjectStorageJoinedDevicesResourceFactory,
    createObjectStorageConnectionProbeFactory,
    createObjectStoragePreferredTweakProbeFactory,
    createObjectStorageSecuritySeedResourceFactory,
} from "./resources";
import { OBJECT_STORAGE_CENTRAL_REMOTE_ADMINISTRATION_CAPABILITY } from "./centralRemoteAdministration";

/** Host environment sufficient to construct the Object Storage provider. */
export type CentralReplicatorProviderHost = LiveSyncCouchDBReplicatorEnv;

/** Minimal operation required by the central one-shot adapters. */
interface OneShotOutcomeReplicator extends ReplicatorInstance {
    openOneShotReplicationWithOutcome(setting: RemoteDBSettings, showResult: boolean): Promise<ReplicationOutcome>;
}

/** Narrow structurally so the shared adapter does not depend on either concrete provider class. */
function isOneShotOutcomeReplicator(instance: ReplicatorInstance): instance is OneShotOutcomeReplicator {
    return (
        "openOneShotReplicationWithOutcome" in instance &&
        typeof instance.openOneShotReplicationWithOutcome === "function"
    );
}

async function runOneShotWithOutcome(
    instance: ReplicatorInstance,
    setting: RemoteDBSettings,
    showResult: boolean
): Promise<ReplicationOutcome> {
    if (!isOneShotOutcomeReplicator(instance)) {
        return replicationFailed(new Error("The configured provider does not implement one-shot replication."));
    }
    return await instance.openOneShotReplicationWithOutcome(setting, showResult);
}

// Manual and unattended wrappers share the provider transfer operation, but
// keep interaction authority and result presentation explicit at this boundary.
const userInitiatedOneShot: UserInitiatedOneShotRunner = async (instance, setting, request) => {
    return await runOneShotWithOutcome(
        instance,
        setting,
        request.progressPresentation === REPLICATION_PROGRESS_PRESENTATIONS.NOTICE
    );
};

const unattendedOneShot: UnattendedOneShotRunner = async (instance, setting, request) => {
    if (request.interaction.kind !== NO_INTERACTION.kind) return replicationBlocked("interaction-required");
    return await runOneShotWithOutcome(instance, setting, false);
};

/**
 * Build the complete, deliberately concrete central-provider matrix for one
 * LiveSync host. This closed composition is not a runtime provider registry.
 */
export function createCentralReplicatorProviderDefinitions(
    host: CentralReplicatorProviderHost
): ReplicatorProviderDefinitionMap {
    return defineReplicatorProviderDefinitions([REMOTE_MINIO] as const, {
        [REMOTE_MINIO]: {
            kind: REMOTE_MINIO,
            diagnosticName: "Object Storage",
            readiness: PROVIDER_OWNED_CENTRAL_REMOTE_REPLICATION_READINESS,
            isConfigured: (settings) =>
                settings.remoteType === REMOTE_MINIO && !!settings.endpoint?.trim() && !!settings.bucket?.trim(),
            configurationIdentity: getObjectStorageReplicatorConfigurationIdentity,
            create: () => Promise.resolve(new LiveSyncJournalReplicator(host)),
            remoteResources: {
                [REMOTE_RESOURCE_KINDS.JOINED_DEVICES]: supportedCapability(
                    createObjectStorageJoinedDevicesResourceFactory(host)
                ),
                [REMOTE_RESOURCE_KINDS.CONNECTION]: supportedCapability(
                    createObjectStorageConnectionProbeFactory(host)
                ),
                [REMOTE_RESOURCE_KINDS.PREFERRED_TWEAK]: supportedCapability(
                    createObjectStoragePreferredTweakProbeFactory(host)
                ),
                [REMOTE_RESOURCE_KINDS.SECURITY_SEED]: supportedCapability(
                    createObjectStorageSecuritySeedResourceFactory(host)
                ),
                [REMOTE_RESOURCE_KINDS.SYNCHRONISATION_INFORMATION]: CAPABILITY_NOT_APPLICABLE,
                [REMOTE_RESOURCE_KINDS.INITIAL_FETCH_FAST_FORWARD]: CAPABILITY_NOT_APPLICABLE,
            },
            centralRemoteAdministration: OBJECT_STORAGE_CENTRAL_REMOTE_ADMINISTRATION_CAPABILITY,
            userInitiatedOneShot: supportedCapability(userInitiatedOneShot),
            unattendedOneShot: supportedCapability(unattendedOneShot),
            continuous: CAPABILITY_NOT_APPLICABLE,
            stopActiveTransfer: supportedStopActiveTransfer(),
        },
    });
}
