import { describe, expect, it, vi } from "vitest";
import { LOG_LEVEL_URGENT } from "octagonal-wheels/common/logger";
import { checkBucketSize } from "./bucketSizeWarning";

function createHost(limitMB: number, estimatedSize: number | undefined, online = true) {
    const getRemoteStatus = vi.fn(async () => (estimatedSize === undefined ? false : { estimatedSize }));
    const host = {
        services: {
            API: { isOnline: online },
            setting: { currentSettings: () => ({ notifyThresholdOfRemoteStorageSize: limitMB }) },
            replicator: { getActiveReplicator: () => ({ getRemoteStatus }) },
        },
    } as never;
    return { host, getRemoteStatus };
}

describe("bucket size warning", () => {
    it("says so once, without asking anything, when the bucket is above the warning", async () => {
        const { host } = createHost(1, 3 * 1024 * 1024);
        const log = vi.fn();
        await checkBucketSize(host, log);
        expect(log).toHaveBeenCalledWith(expect.stringContaining("more than your 1 MB warning"), LOG_LEVEL_URGENT);
    });

    it("stays quiet below the warning", async () => {
        const { host } = createHost(10, 1024);
        const log = vi.fn();
        await checkBucketSize(host, log);
        expect(log).not.toHaveBeenCalledWith(expect.anything(), LOG_LEVEL_URGENT);
    });

    it.each([
        ["the warning is off", 0, true],
        ["the device is offline", 10, false],
    ])("does not measure when %s", async (_label, limit, online) => {
        const { host, getRemoteStatus } = createHost(limit, 1, online);
        await checkBucketSize(host, vi.fn());
        expect(getRemoteStatus).not.toHaveBeenCalled();
    });
});
