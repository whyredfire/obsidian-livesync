import type { RemoteDBSettings, RemotePreferredTweakResult } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { PreferredTweakProbe, PreferredTweakProbeFactory } from "@vrtmrz/livesync-commonlib/replication";
import { type LiveSyncCouchDBReplicatorEnv } from "@vrtmrz/livesync-commonlib/compat/replication/couchdb/LiveSyncReplicator";
import { LiveSyncJournalReplicator } from "@vrtmrz/livesync-commonlib/compat/replication/journal/LiveSyncJournalReplicator";
import { createReplicatorDisposer, snapshotRemoteSettings, type ResourceReplicator } from "./shared";

/** Host environment sufficient to construct either preferred-tweak probe. */
export type PreferredTweakResourceHost = LiveSyncCouchDBReplicatorEnv;

interface PreferredTweakReplicator extends ResourceReplicator {
    getRemotePreferredTweakValues(setting: RemoteDBSettings): Promise<RemotePreferredTweakResult>;
}

function createPreferredTweakProbe(
    replicator: PreferredTweakReplicator,
    snapshot: RemoteDBSettings
): PreferredTweakProbe {
    return {
        read: () => replicator.getRemotePreferredTweakValues(snapshot),
        dispose: createReplicatorDisposer(replicator),
    };
}

/** Build an unpublished, independently disposed Object Storage preferred-tweak probe. */
export function createObjectStoragePreferredTweakProbeFactory(
    host: PreferredTweakResourceHost
): PreferredTweakProbeFactory {
    return (setting) => {
        const snapshot = snapshotRemoteSettings(setting);
        return Promise.resolve(createPreferredTweakProbe(new LiveSyncJournalReplicator(host), snapshot));
    };
}
