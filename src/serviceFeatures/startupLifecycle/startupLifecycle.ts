import { EVENT_SETTING_SAVED } from "@/common/events";
import { $msg } from "@/common/translation";
import { createInstanceLogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import { LOG_LEVEL_NOTICE } from "@vrtmrz/livesync-commonlib/compat/common/logger";
import type {
    StartupLifecycleHost,
    StartupLifecycleFeatureOptions,
    ConfiguredStartupLifecycleOperations,
} from "./types";
import { runConfiguredStartupLifecycle, runStartupEntryLifecycle } from "./configuredStartupLifecycle";
import { migrateBulkSendSetting } from "./bulkSettingMigration";

/** Layout admission runs after ordinary priority-0 host handlers. */
export const STARTUP_LIFECYCLE_LAYOUT_PRIORITY = 1 as const;

function readValue<T>(value: T | (() => T)): T {
    return typeof value === "function" ? (value as () => T)() : value;
}

function createDefaultOperations(
    host: StartupLifecycleHost,
    options: StartupLifecycleFeatureOptions,
    log: ReturnType<typeof createInstanceLogFunction>
): ConfiguredStartupLifecycleOperations {
    const { services } = host;
    const defaultOperations = {
        databaseReady: () => services.database.localDatabase.isReady,
        reportDatabaseNotReady: () => log($msg("moduleMigration.logLocalDatabaseNotReady"), LOG_LEVEL_NOTICE),
        migrateBulkSend: () =>
            migrateBulkSendSetting({
                settings: services.setting.currentSettings(),
                log,
                saveSettings: () => services.setting.saveSettingData(),
            }),
    } satisfies ConfiguredStartupLifecycleOperations;

    return {
        databaseReady: options.databaseReady ?? defaultOperations.databaseReady,
        reportDatabaseNotReady: options.reportDatabaseNotReady ?? defaultOperations.reportDatabaseNotReady,
        migrateBulkSend: options.migrateBulkSend ?? defaultOperations.migrateBulkSend,
    };
}

/**
 * Compose configured Vault admission and start-up migrations around one
 * host-owned service context.
 */
export function useStartupLifecycleFeature(host: StartupLifecycleHost, options: StartupLifecycleFeatureOptions = {}): void {
    const log = options.log ?? createInstanceLogFunction("SF:StartupLifecycle", host.services.API);
    const operations = createDefaultOperations(host, options, log);
    let layoutAdmitted = false;
    let layoutEvaluated = false;
    let generationRetired = false;
    let eventsBound = false;
    let eventUnsubscribers: Array<() => void> = [];

    const isConfigured = () => {
        const configured = options.configured;
        return configured === undefined
            ? host.services.setting.currentSettings().isConfigured === true
            : readValue(configured);
    };


    const retireGeneration = () => {
        if (generationRetired) return;
        generationRetired = true;
        layoutAdmitted = false;
        for (const unsubscribe of eventUnsubscribers) unsubscribe();
        eventUnsubscribers = [];
    };

    const bindRequestEvents = () => {
        if (eventsBound || generationRetired) return;
        eventsBound = true;
        eventUnsubscribers = [
            host.services.context.events.onEvent(EVENT_SETTING_SAVED, (settings) => {
                if (settings.isConfigured !== true) retireGeneration();
            }),
        ];
    };

    const layoutAdmission = (): Promise<boolean> => {
        if (generationRetired) return Promise.resolve(false);
        if (layoutEvaluated) {
            if (layoutAdmitted && !isConfigured()) retireGeneration();
            return Promise.resolve(layoutAdmitted);
        }

        layoutEvaluated = true;
        const admitted = runStartupEntryLifecycle({ configured: isConfigured });
        if (!admitted) {
            retireGeneration();
            return Promise.resolve(false);
        }
        layoutAdmitted = true;
        bindRequestEvents();
        return Promise.resolve(true);
    };

    const firstInitialise = async (): Promise<boolean> => {
        if (!layoutAdmitted || generationRetired || !isConfigured()) return false;
        return await runConfiguredStartupLifecycle(operations);
    };

    host.services.appLifecycle.onLayoutReady.addHandler(layoutAdmission, STARTUP_LIFECYCLE_LAYOUT_PRIORITY);
    host.services.appLifecycle.onFirstInitialise.addHandler(firstInitialise);
}
