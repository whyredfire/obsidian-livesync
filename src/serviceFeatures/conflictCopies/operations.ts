import {
    LOG_LEVEL_INFO,
    LOG_LEVEL_NOTICE,
    LOG_LEVEL_VERBOSE,
    MISSING_OR_ERROR,
    type FilePathWithPrefix,
    type ObsidianLiveSyncSettings,
    type diff_result,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import type { StorageAccess } from "@vrtmrz/livesync-commonlib/compat/interfaces/StorageAccess";
import type {
    IAppLifecycleService,
    IConflictService,
    IPathService,
    IReplicationService,
} from "@vrtmrz/livesync-commonlib/compat/services/base/IService";
import type { LiveSyncLocalDB } from "@vrtmrz/livesync-commonlib/compat/pouchdb/LiveSyncLocalDB";
import type { LogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import { stripAllPrefixes } from "@vrtmrz/livesync-commonlib/compat/string_and_binary/path";
import { NO_INTERACTION } from "@vrtmrz/livesync-commonlib/replication";
import { conflictedCopyPath, splitByAge } from "./naming";

export interface ConflictCopyDependencies {
    readonly signal: AbortSignal;
    readonly localDatabase: () => Pick<LiveSyncLocalDB, "getDBEntry" | "findAllDocs">;
    readonly storageAccess: Pick<StorageAccess, "isExists" | "writeFileAuto">;
    readonly path: Pick<IPathService, "getPath">;
    readonly appLifecycle: Pick<IAppLifecycleService, "isSuspended">;
    readonly conflict: Pick<IConflictService, "queueCheckFor" | "resolveByDeletingRevision">;
    readonly replication: Pick<IReplicationService, "replicateUnattendedByEvent">;
    readonly currentSettings: () => Pick<ObsidianLiveSyncSettings, "syncAfterMerge">;
    readonly log: LogFunction;
}

/**
 * Resolve the conflicts which automatic merging could not, without asking:
 * the newer version stays in the note and the other one is saved next to it as
 * "Note (Conflicted copy YYYYMMDDHHMM).md", like Obsidian Sync's conflict files.
 * Nothing is lost, and the copy synchronises like any other note.
 */
export function createConflictCopyOperations(dependencies: ConflictCopyDependencies) {
    const freeCopyPath = async (path: string, mtime: number): Promise<string> => {
        let candidate = conflictedCopyPath(path, mtime);
        for (let attempt = 1; await dependencies.storageAccess.isExists(candidate); attempt++) {
            candidate = conflictedCopyPath(path, mtime, attempt);
        }
        return candidate;
    };

    const keepConflictedCopy = async (filename: FilePathWithPrefix, conflict: diff_result): Promise<boolean> => {
        if (dependencies.signal.aborted) return false;
        const current = await dependencies
            .localDatabase()
            .getDBEntry(filename, { conflicts: true }, false, true, true);
        if (current === false || !current._conflicts || current._conflicts.length === 0) {
            dependencies.log(`Conflict: nothing left to resolve in ${filename}`, LOG_LEVEL_VERBOSE);
            return false;
        }
        if (current._rev !== conflict.left.rev || !current._conflicts.includes(conflict.right.rev)) {
            // Another change arrived meanwhile; look at the file again.
            await dependencies.conflict.queueCheckFor(filename);
            return false;
        }

        const { older } = splitByAge(conflict);
        if (!older.deleted) {
            const copyPath = await freeCopyPath(stripAllPrefixes(filename), older.mtime);
            if (!(await dependencies.storageAccess.writeFileAuto(copyPath, older.data))) {
                dependencies.log(`Could not save the conflicted copy of ${filename}`, LOG_LEVEL_NOTICE);
                return false;
            }
            dependencies.log(
                `${filename} was changed on two devices. The other version was saved as ${copyPath}.`,
                LOG_LEVEL_NOTICE
            );
        }
        const result = await dependencies.conflict.resolveByDeletingRevision(filename, older.rev, "Conflicted copy");
        if (result === MISSING_OR_ERROR) {
            dependencies.log(`Could not finish resolving the conflict in ${filename}`, LOG_LEVEL_NOTICE);
            return false;
        }
        if (dependencies.signal.aborted) return true;
        if (dependencies.currentSettings().syncAfterMerge && !dependencies.appLifecycle.isSuspended()) {
            await dependencies.replication.replicateUnattendedByEvent({ trigger: "merge", interaction: NO_INTERACTION });
        }
        // A file can hold more than two versions; resolve the next pair too.
        await dependencies.conflict.queueCheckFor(filename);
        return true;
    };

    /** At start-up, resolve conflicts left over from earlier sessions. */
    const scanStartupIssues = async (): Promise<boolean> => {
        if (dependencies.signal.aborted) return false;
        try {
            for await (const doc of dependencies.localDatabase().findAllDocs({ conflicts: true })) {
                if (dependencies.signal.aborted) return false;
                if (!("_conflicts" in doc)) continue;
                const path = dependencies.path.getPath(doc);
                dependencies.log(`Conflicted: ${path}`, LOG_LEVEL_INFO);
                await dependencies.conflict.queueCheckFor(path);
            }
        } catch (error) {
            dependencies.log("Could not scan for conflicted files.", LOG_LEVEL_NOTICE);
            dependencies.log(error, LOG_LEVEL_VERBOSE);
            return false;
        }
        return true;
    };

    return { keepConflictedCopy, scanStartupIssues };
}
