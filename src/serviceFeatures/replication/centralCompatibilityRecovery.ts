import { LOG_LEVEL_INFO, LOG_LEVEL_URGENT, LOG_LEVEL_VERBOSE, Logger } from "octagonal-wheels/common/logger";
import {
    CENTRAL_COMPATIBILITY_REJECTION_REASONS,
    type ReplicationFailureRequest,
} from "@vrtmrz/livesync-commonlib/replication";
import type { LiveSyncBaseCore } from "@/LiveSyncBaseCore";

type CentralCompatibilityRecoveryServices = Pick<LiveSyncBaseCore["services"], "appLifecycle" | "setting">;

/** Collaborators for recovering from a remote which no longer accepts this device. */
interface CentralCompatibilityRecoveryContext {
    readonly rebuilder: Pick<LiveSyncBaseCore["rebuilder"], "scheduleFetch">;
    readonly services: CentralCompatibilityRecoveryServices;
    readonly now?: () => number;
}

/** Download again at most this often, so that a failing download cannot restart Obsidian in a loop. */
export const AUTOMATIC_FETCH_INTERVAL_MS = 30 * 60 * 1000;
const LAST_AUTOMATIC_FETCH_KEY = "redSyncLastAutomaticFetch";

/** Reasons which mean that the data in R2 was replaced, or no longer matches this device. */
const REDOWNLOAD_REASONS: ReadonlySet<string> = new Set([
    CENTRAL_COMPATIBILITY_REJECTION_REASONS.NODE_LOCKED,
    CENTRAL_COMPATIBILITY_REJECTION_REASONS.NODE_CLEANED,
    CENTRAL_COMPATIBILITY_REJECTION_REASONS.TWEAK_MISMATCH,
]);

/**
 * When another device replaced the data in R2 (or changed the shared synchronisation
 * settings), this device can no longer synchronise with it. Instead of asking, Red Sync
 * downloads everything again and merges it with this Vault, the same way as joining:
 * the newer copy of each file wins and files which exist only here are kept.
 */
export function createCentralCompatibilityRecovery(context: CentralCompatibilityRecoveryContext) {
    const now = context.now ?? (() => Date.now());

    async function handleReplicationFailure(request: ReplicationFailureRequest): Promise<boolean> {
        const reason = request.outcome.recoveryHint?.reason;
        if (!reason || !REDOWNLOAD_REASONS.has(reason)) {
            if (request.interaction.kind === "forbidden") {
                Logger("Replication failed on an unattended path.", LOG_LEVEL_INFO);
            }
            return false;
        }
        const config = context.services.setting.config;
        const last = Number(await config.getValue(LAST_AUTOMATIC_FETCH_KEY, "0")) || 0;
        if (now() - last < AUTOMATIC_FETCH_INTERVAL_MS) {
            Logger(
                "This device still cannot synchronise with R2. Use 'Fetch everything from R2' in the Red Sync settings.",
                LOG_LEVEL_URGENT
            );
            return false;
        }
        await config.setValue(LAST_AUTOMATIC_FETCH_KEY, String(now()));
        Logger(`Remote rejected this device: ${reason}`, LOG_LEVEL_VERBOSE);
        Logger(
            "Another device replaced the data in R2. Red Sync will download it again and restart Obsidian shortly.",
            LOG_LEVEL_URGENT
        );
        await context.rebuilder.scheduleFetch();
        context.services.appLifecycle.scheduleRestart();
        return false;
    }

    return Object.freeze({ handleReplicationFailure });
}
