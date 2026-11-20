import { describe, expect, it, vi } from "vitest";
import {
    runConfiguredStartupLifecycle,
    runStartupEntryLifecycle,
    type StartupEntryLifecycleRuntime,
} from "./configuredStartupLifecycle";
import type { ConfiguredStartupLifecycleOperations } from "./types";

function createRuntime(events: string[] = []): ConfiguredStartupLifecycleOperations {
    return {
        databaseReady: true,
        reportDatabaseNotReady: vi.fn(() => events.push("database-not-ready")),
        migrateBulkSend: vi.fn(async () => {
            events.push("bulk-send");
        }),
    };
}

describe("runConfiguredStartupLifecycle", () => {
    it("runs the start-up migration without asking anything", async () => {
        const events: string[] = [];
        await expect(runConfiguredStartupLifecycle(createRuntime(events))).resolves.toBe(true);
        expect(events).toEqual(["bulk-send"]);
    });

    it("stops when the local database is not ready", async () => {
        const events: string[] = [];
        const runtime = createRuntime(events);
        Object.assign(runtime, { databaseReady: false });

        await expect(runConfiguredStartupLifecycle(runtime)).resolves.toBe(false);
        expect(events).toEqual(["database-not-ready"]);
    });
});

describe("runStartupEntryLifecycle", () => {
    it("stops start-up quietly for an unconfigured Vault", () => {
        const runtime: StartupEntryLifecycleRuntime = { configured: false };
        expect(runStartupEntryLifecycle(runtime)).toBe(false);
    });

    it("admits a configured Vault", () => {
        expect(runStartupEntryLifecycle({ configured: true })).toBe(true);
    });
});
