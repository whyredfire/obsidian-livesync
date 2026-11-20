import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { createInstanceLogFunction, type LogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import { LOG_LEVEL_INFO, LOG_LEVEL_URGENT, LOG_LEVEL_VERBOSE } from "octagonal-wheels/common/logger";
import { sizeToHumanReadable } from "octagonal-wheels/number";

type BucketSizeHost = NecessaryServices<"API" | "appLifecycle" | "setting" | "replicator", never>;

interface RemoteStatusReader {
    getRemoteStatus(setting: unknown): Promise<false | { estimatedSize?: number }>;
}

function canReadRemoteStatus(replicator: unknown): replicator is RemoteStatusReader {
    return (
        typeof replicator === "object" &&
        replicator !== null &&
        typeof (replicator as Partial<RemoteStatusReader>).getRemoteStatus === "function"
    );
}

/**
 * Once per start-up, if a bucket size warning is set (more than 0 MB) and the bucket
 * has grown beyond it, show one short message. There is nothing to answer.
 */
export async function checkBucketSize(host: BucketSizeHost, log: LogFunction): Promise<void> {
    const settings = host.services.setting.currentSettings();
    const limitMB = settings.notifyThresholdOfRemoteStorageSize;
    if (!(limitMB > 0) || host.services.API.isOnline === false) return;
    try {
        const replicator: unknown = host.services.replicator.getActiveReplicator();
        if (!canReadRemoteStatus(replicator)) return;
        const status = await replicator.getRemoteStatus(settings);
        const size = status ? status.estimatedSize : undefined;
        if (size === undefined) return;
        if (size <= limitMB * 1024 * 1024) {
            log(`The R2 bucket holds about ${sizeToHumanReadable(size)}.`, LOG_LEVEL_INFO);
            return;
        }
        log(
            `Your R2 bucket holds about ${sizeToHumanReadable(size)}, more than your ${limitMB} MB warning. You can change the warning in the Red Sync settings.`,
            LOG_LEVEL_URGENT
        );
    } catch (error) {
        log("Could not measure the R2 bucket.", LOG_LEVEL_VERBOSE);
        log(error, LOG_LEVEL_VERBOSE);
    }
}

export function useBucketSizeWarning(host: BucketSizeHost): void {
    const log = createInstanceLogFunction("SF:BucketSize", host.services.API);
    host.services.appLifecycle.onScanningStartupIssues.addHandler(async () => {
        await checkBucketSize(host, log);
        return true;
    });
}
