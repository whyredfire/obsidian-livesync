import type { ConfiguredStartupLifecycleOperations, StartupLifecycleValue } from "./types";

function readValue<T>(value: StartupLifecycleValue<T>): T {
    return typeof value === "function" ? (value as () => T)() : value;
}

/**
 * Keeps an unconfigured Vault outside database initialisation and all
 * configured-only start-up work. It stays quiet: setup starts from the settings page.
 */
export interface StartupEntryLifecycleRuntime {
    readonly configured: StartupLifecycleValue<boolean>;
}

export function runStartupEntryLifecycle(runtime: StartupEntryLifecycleRuntime): boolean {
    return readValue(runtime.configured);
}

/** Start-up work for a configured device. It never asks anything. */
export async function runConfiguredStartupLifecycle(runtime: ConfiguredStartupLifecycleOperations): Promise<boolean> {
    if (!readValue(runtime.databaseReady)) {
        runtime.reportDatabaseNotReady();
        return false;
    }
    await runtime.migrateBulkSend();
    return true;
}
