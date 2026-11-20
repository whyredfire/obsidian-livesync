import { type EntryMilestoneInfo, type RemoteDBSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { LiveSyncJournalReplicator } from "@vrtmrz/livesync-commonlib/compat/replication/journal/LiveSyncJournalReplicator";
import {
    CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS,
    CENTRAL_REMOTE_ADMINISTRATION_OBSERVATION_KINDS,
    applyCentralRemoteAdministrationMutation,
    milestoneSatisfiesCentralRemoteAdministration,
    centralRemoteAdministrationVerificationFailed,
    centralRemoteAdministrationVerified,
    supportedCapability,
    type MilestoneCentralRemoteAdministrationObservation,
    type CentralRemoteAdministrationFailureReason,
    type CentralRemoteAdministrationRequest,
    type CentralRemoteAdministrationReplicator,
    type CentralRemoteAdministrationResult,
    type CentralRemoteAdministrationRunner,
    type ReplicatorInstance,
    type SupportedCapability,
} from "@vrtmrz/livesync-commonlib/replication";

/**
 * Central milestone administration shared by the two central providers.
 *
 * The provider definition selects a reader before mutation. CouchDB then owns
 * a fresh verification connection, while Object Storage borrows the active
 * Journal client. Local node identity is established before either mutation.
 */
const JOURNAL_MILESTONE_PATH = "_00000000-milestone.json";

/** A provider read result, including failures which settled without a throw. */
type CentralMilestoneReadResult =
    | { readonly milestone: EntryMilestoneInfo | false | undefined }
    | { readonly failureReason: CentralRemoteAdministrationFailureReason; readonly detail?: unknown };

/** A settings-bound postcondition reader prepared before remote mutation. */
type PreparedCentralMilestoneReader = () => Promise<CentralMilestoneReadResult>;

/** Select and validate the provider-specific reader without performing I/O. */
type CentralMilestoneReaderPreparer = (
    replicator: CentralRemoteAdministrationReplicator,
    setting: RemoteDBSettings
) => PreparedCentralMilestoneReader;

type JournalAdministrationClient = Pick<LiveSyncJournalReplicator["client"], "downloadJsonWithResult">;

function isCentralRemoteAdministrationReplicator(
    replicator: ReplicatorInstance
): replicator is CentralRemoteAdministrationReplicator {
    return (
        "nodeid" in replicator &&
        typeof replicator.nodeid === "string" &&
        "markRemoteResolved" in replicator &&
        typeof replicator.markRemoteResolved === "function" &&
        "markRemoteLocked" in replicator &&
        typeof replicator.markRemoteLocked === "function"
    );
}

async function ensureLocalNodeIdentity(
    replicator: CentralRemoteAdministrationReplicator
): Promise<CentralRemoteAdministrationResult | undefined> {
    if (replicator.nodeid) {
        return undefined;
    }
    if ((await replicator.initializeDatabaseForReplication()) && replicator.nodeid) {
        return undefined;
    }
    return centralRemoteAdministrationVerificationFailed(
        CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS.LOCAL_IDENTITY_UNAVAILABLE
    );
}

function observeMilestone(
    replicator: CentralRemoteAdministrationReplicator,
    milestone: EntryMilestoneInfo
): MilestoneCentralRemoteAdministrationObservation {
    return {
        kind: CENTRAL_REMOTE_ADMINISTRATION_OBSERVATION_KINDS.MILESTONE,
        locked: !!milestone.locked,
        accepted: !!milestone.accepted_nodes?.includes(replicator.nodeid),
        nodeId: replicator.nodeid,
    };
}

function resultFromMilestone(
    replicator: CentralRemoteAdministrationReplicator,
    request: CentralRemoteAdministrationRequest,
    milestone: EntryMilestoneInfo | false | undefined
): CentralRemoteAdministrationResult {
    if (!milestone) {
        return centralRemoteAdministrationVerificationFailed(
            CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS.MILESTONE_NOT_FOUND
        );
    }
    const observation = observeMilestone(replicator, milestone);
    return milestoneSatisfiesCentralRemoteAdministration(request.action, observation)
        ? centralRemoteAdministrationVerified(observation)
        : centralRemoteAdministrationVerificationFailed(
              CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS.POSTCONDITION_MISMATCH,
              {
                  observation,
              }
          );
}

/**
 * Apply and verify the central milestone protocol without selecting a provider.
 *
 * The provider definition has already selected the reader preparer. Preparing
 * it before mutation rejects incomplete composition before a remote write and
 * binds any provider-owned client which must be used for postcondition reading.
 */
async function runCentralRemoteAdministration(
    replicator: CentralRemoteAdministrationReplicator,
    setting: RemoteDBSettings,
    request: CentralRemoteAdministrationRequest,
    prepareMilestoneReader: CentralMilestoneReaderPreparer
): Promise<CentralRemoteAdministrationResult> {
    const identityFailure = await ensureLocalNodeIdentity(replicator);
    if (identityFailure) return identityFailure;

    const readMilestone = prepareMilestoneReader(replicator, setting);
    await applyCentralRemoteAdministrationMutation(replicator, setting, request.action);

    const readResult = await readMilestone();
    if ("failureReason" in readResult) {
        return centralRemoteAdministrationVerificationFailed(readResult.failureReason, { detail: readResult.detail });
    }
    return resultFromMilestone(replicator, request, readResult.milestone);
}

function isJournalAdministrationClient(client: unknown): client is JournalAdministrationClient {
    return (
        typeof client === "object" &&
        client !== null &&
        "downloadJsonWithResult" in client &&
        typeof client.downloadJsonWithResult === "function"
    );
}

function requireJournalAdministrationClient(
    replicator: CentralRemoteAdministrationReplicator
): JournalAdministrationClient {
    if (!("client" in replicator) || !isJournalAdministrationClient(replicator.client)) {
        throw new Error("The configured Object Storage administration adapter does not provide milestone access.");
    }
    return replicator.client;
}

function assertNeverJournalStorageRead(result: never): never {
    throw new Error(`Unexpected Journal storage read result: ${String(result)}`);
}

function prepareObjectStorageMilestoneReader(
    replicator: CentralRemoteAdministrationReplicator
): PreparedCentralMilestoneReader {
    // The Journal client belongs to the active Replicator. This reader borrows
    // it for the provider's distinct milestone path and must not dispose it.
    const client = requireJournalAdministrationClient(replicator);

    return async () => {
        try {
            const result = await client.downloadJsonWithResult<EntryMilestoneInfo>(JOURNAL_MILESTONE_PATH);
            switch (result.status) {
                case "available":
                    return { milestone: result.value };
                case "not-found":
                    return { milestone: undefined };
                case "unavailable":
                    return {
                        failureReason: CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS.MILESTONE_READ_FAILED,
                        detail: result.error,
                    };
                default:
                    return assertNeverJournalStorageRead(result);
            }
        } catch (error) {
            return {
                failureReason: CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS.MILESTONE_READ_FAILED,
                detail: error,
            };
        }
    };
}

const runObjectStorageCentralRemoteAdministration: CentralRemoteAdministrationRunner = async (
    replicator,
    setting,
    request
) => {
    if (!isCentralRemoteAdministrationReplicator(replicator)) {
        return centralRemoteAdministrationVerificationFailed(
            CENTRAL_REMOTE_ADMINISTRATION_FAILURE_REASONS.CAPABILITY_NOT_APPLICABLE
        );
    }
    return await runCentralRemoteAdministration(replicator, setting, request, prepareObjectStorageMilestoneReader);
};

/** Object Storage mutation and milestone postcondition verification capability. */
export const OBJECT_STORAGE_CENTRAL_REMOTE_ADMINISTRATION_CAPABILITY: SupportedCapability<CentralRemoteAdministrationRunner> =
    supportedCapability(runObjectStorageCentralRemoteAdministration);
