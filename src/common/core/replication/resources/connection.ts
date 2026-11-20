import type { RemoteDBSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type {
    ConnectionProbeFactory,
    RemoteConnectionProbe,
    RemoteConnectionProbeOptions,
} from "@vrtmrz/livesync-commonlib/replication";
import { type LiveSyncCouchDBReplicatorEnv } from "@vrtmrz/livesync-commonlib/compat/replication/couchdb/LiveSyncReplicator";
import { LiveSyncJournalReplicator } from "@vrtmrz/livesync-commonlib/compat/replication/journal/LiveSyncJournalReplicator";
import { createReplicatorDisposer, snapshotRemoteSettings } from "./shared";

/** Host environment sufficient to construct either central connection probe. */
export type ConnectionResourceHost = LiveSyncCouchDBReplicatorEnv;

function createObjectStorageConnectionProbe(
    replicator: LiveSyncJournalReplicator,
    snapshot: RemoteDBSettings
): RemoteConnectionProbe {
    const dispose = createReplicatorDisposer(replicator);
    return {
        check: async (options: RemoteConnectionProbeOptions = {}) => {
            try {
                const connected = await replicator.tryConnectRemote(snapshot, options.showResult ?? false);
                return connected ? { ok: true } : { ok: false };
            } catch (error) {
                return { ok: false, reason: error };
            }
        },
        inspectPathIdentity: () => replicator.inspectRemotePathIdentity(snapshot),
        getStatus: () => replicator.getRemoteStatus(snapshot),
        dispose,
    };
}

/**
 * Build an unpublished Object Storage connection probe for one host.
 *
 * The probe owns its concrete Replicator and never publishes or replaces the
 * active provider instance.
 */
export function createObjectStorageConnectionProbeFactory(host: ConnectionResourceHost): ConnectionProbeFactory {
    return (setting) => {
        const snapshot = snapshotRemoteSettings(setting);
        return Promise.resolve(createObjectStorageConnectionProbe(new LiveSyncJournalReplicator(host), snapshot));
    };
}
