import { describe, expect, it } from "vitest";
import { MemoryValueStore } from "@vrtmrz/value-store";
import { clearPendingSetup, markPendingSetup, readPendingSetup } from "./pendingSetup";

function host(vaultName = "vault") {
    return {
        services: { setting: { deviceValues: new MemoryValueStore() }, vault: { vaultName: () => vaultName } },
    } as unknown as Parameters<typeof readPendingSetup>[0];
}

describe("pending setup", () => {
    it("records and clears the setup mode for this vault", async () => {
        const target = host();
        await expect(readPendingSetup(target)).resolves.toBeUndefined();
        await markPendingSetup(target, "join", 1_000);
        await expect(readPendingSetup(target, 2_000)).resolves.toBe("join");
        await clearPendingSetup(target);
        await expect(readPendingSetup(target, 2_000)).resolves.toBeUndefined();
    });

    it("ignores a note older than an hour", async () => {
        const target = host();
        await markPendingSetup(target, "new", 0);
        await expect(readPendingSetup(target, 60 * 60 * 1000)).resolves.toBe("new");
        await expect(readPendingSetup(target, 60 * 60 * 1000 + 1)).resolves.toBeUndefined();
    });
});
