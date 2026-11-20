import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { createInstanceLogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import { createConflictCopyOperations } from "./operations";

export type ConflictCopiesHost = NecessaryServices<
    "API" | "appLifecycle" | "conflict" | "replication" | "database" | "setting" | "path",
    "storageAccess"
>;

/** Resolve conflicts which cannot be merged by keeping a conflicted copy. */
export function useConflictCopies(host: ConflictCopiesHost): void {
    const services = host.services;
    const lifetime = new AbortController();
    const operations = createConflictCopyOperations({
        signal: lifetime.signal,
        localDatabase: () => services.database.localDatabase,
        storageAccess: host.serviceModules.storageAccess,
        path: services.path,
        appLifecycle: services.appLifecycle,
        conflict: services.conflict,
        replication: services.replication,
        currentSettings: () => services.setting.currentSettings(),
        log: createInstanceLogFunction("SF:ConflictCopies", services.API),
    });
    services.appLifecycle.onScanningStartupIssues.addHandler(operations.scanStartupIssues);
    services.conflict.resolveByUserInteraction.addHandler(operations.keepConflictedCopy);
    services.appLifecycle.onUnload.addHandler(() => {
        lifetime.abort();
        return Promise.resolve(true);
    });
}
