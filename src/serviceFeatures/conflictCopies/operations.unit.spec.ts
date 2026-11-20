import { describe, expect, it, vi } from "vitest";
import {
    AUTO_MERGED,
    LOG_LEVEL_NOTICE,
    MISSING_OR_ERROR,
    type FilePathWithPrefix,
    type diff_result,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { createConflictCopyOperations, type ConflictCopyDependencies } from "./operations";

const path = "Notes/note.md" as FilePathWithPrefix;
const conflict: diff_result = {
    left: { rev: "2-left", data: "newer text", ctime: 1, mtime: new Date(2026, 10, 21, 9, 30).getTime() },
    right: { rev: "2-right", data: "older text", ctime: 1, mtime: new Date(2026, 10, 21, 8, 15).getTime() },
    diff: [],
};

async function* documents(items: unknown[]) {
    for (const item of items) yield item;
}

function createOperations(current: unknown = { _rev: "2-left", _conflicts: ["2-right"] }, stored: unknown[] = []) {
    const existing = new Set<string>();
    const dependencies = {
        signal: new AbortController().signal,
        localDatabase: () => ({
            getDBEntry: vi.fn(async () => current),
            findAllDocs: vi.fn(() => documents(stored)),
        }),
        storageAccess: {
            isExists: vi.fn(async (candidate: string) => existing.has(candidate)),
            writeFileAuto: vi.fn(async (_path: string, _data: string) => true),
        },
        path: { getPath: vi.fn((doc: { path: string }) => doc.path) },
        appLifecycle: { isSuspended: vi.fn(() => false) },
        conflict: {
            queueCheckFor: vi.fn(async () => undefined),
            resolveByDeletingRevision: vi.fn(async () => AUTO_MERGED),
        },
        replication: { replicateUnattendedByEvent: vi.fn(async () => ({ status: "completed" as const })) },
        currentSettings: () => ({ syncAfterMerge: true }),
        log: vi.fn(),
    };
    const operations = createConflictCopyOperations(dependencies as unknown as ConflictCopyDependencies);
    return { operations, dependencies, existing };
}

describe("conflicted copies", () => {
    it("keeps the newer version and saves the older one beside it, without asking", async () => {
        const { operations, dependencies } = createOperations();

        await expect(operations.keepConflictedCopy(path, conflict)).resolves.toBe(true);

        expect(dependencies.storageAccess.writeFileAuto).toHaveBeenCalledWith(
            "Notes/note (Conflicted copy 202611210815).md",
            "older text"
        );
        expect(dependencies.conflict.resolveByDeletingRevision).toHaveBeenCalledWith(path, "2-right", "Conflicted copy");
        expect(dependencies.replication.replicateUnattendedByEvent).toHaveBeenCalledOnce();
        expect(dependencies.conflict.queueCheckFor).toHaveBeenCalledWith(path);
        expect(dependencies.log).toHaveBeenCalledWith(expect.stringContaining("Conflicted copy"), LOG_LEVEL_NOTICE);
    });

    it("never overwrites an existing conflicted copy", async () => {
        const { operations, dependencies, existing } = createOperations();
        existing.add("Notes/note (Conflicted copy 202611210815).md");

        await operations.keepConflictedCopy(path, conflict);

        expect(dependencies.storageAccess.writeFileAuto).toHaveBeenCalledWith(
            "Notes/note (Conflicted copy 202611210815 2).md",
            "older text"
        );
    });

    it("keeps the deleted side's content when the newer change was a deletion", async () => {
        const { operations, dependencies } = createOperations();
        const deletedNewer: diff_result = { ...conflict, left: { ...conflict.left, deleted: true, data: "" } };

        await operations.keepConflictedCopy(path, deletedNewer);

        expect(dependencies.storageAccess.writeFileAuto).toHaveBeenCalledWith(expect.any(String), "older text");
    });

    it("does not discard the older version when its copy cannot be saved", async () => {
        const { operations, dependencies } = createOperations();
        dependencies.storageAccess.writeFileAuto.mockResolvedValue(false);

        await expect(operations.keepConflictedCopy(path, conflict)).resolves.toBe(false);
        expect(dependencies.conflict.resolveByDeletingRevision).not.toHaveBeenCalled();
    });

    it("looks again instead of acting on revisions which changed meanwhile", async () => {
        const { operations, dependencies } = createOperations({ _rev: "3-other", _conflicts: ["2-right"] });

        await expect(operations.keepConflictedCopy(path, conflict)).resolves.toBe(false);
        expect(dependencies.storageAccess.writeFileAuto).not.toHaveBeenCalled();
        expect(dependencies.conflict.queueCheckFor).toHaveBeenCalledWith(path);
    });

    it("reports a failed resolution without syncing", async () => {
        const { operations, dependencies } = createOperations();
        dependencies.conflict.resolveByDeletingRevision.mockResolvedValue(MISSING_OR_ERROR as never);

        await expect(operations.keepConflictedCopy(path, conflict)).resolves.toBe(false);
        expect(dependencies.replication.replicateUnattendedByEvent).not.toHaveBeenCalled();
    });

    it("resolves conflicts left from earlier sessions at start-up", async () => {
        const { operations, dependencies } = createOperations(undefined, [
            { path: "a.md", _conflicts: ["2-x"] },
            { path: "b.md" },
        ]);

        await expect(operations.scanStartupIssues()).resolves.toBe(true);
        expect(dependencies.conflict.queueCheckFor).toHaveBeenCalledExactlyOnceWith("a.md");
    });
});
