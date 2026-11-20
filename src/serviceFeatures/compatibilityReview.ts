import { VER } from "@vrtmrz/livesync-commonlib/compat/common/types";
import type {
    NecessaryServices,
    NecessaryServicesInterfaces,
} from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { createInstanceLogFunction, type LogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import { LOG_LEVEL_INFO, LOG_LEVEL_URGENT } from "octagonal-wheels/common/logger";
import {
    COMPATIBILITY_PAUSE_SETTING_MESSAGE,
    DATABASE_COMPATIBILITY_VERSION_KEY,
    evaluateCompatibilityPause,
    legacyDatabaseCompatibilityVersionKey,
    type CompatibilityPause,
} from "./compatibilityReview.evaluation.ts";

// Scheduled Fetch and Rebuild run at priorities 10 and 20; settle any pause after them.
const COMPATIBILITY_REVIEW_LAYOUT_PRIORITY = 30;

export type CompatibilityReviewDependencies = NecessaryServicesInterfaces<
    "setting" | "config" | "vault" | "control",
    never
>;

export type CompatibilityReviewHost = NecessaryServices<
    "setting" | "config" | "vault" | "control" | "appLifecycle" | "API",
    never
>;

/**
 * After an update changes the local database format or the settings schema, the
 * engine pauses synchronisation until the change is acknowledged. Red Sync
 * acknowledges it automatically. Only a pause which cannot be resumed (data written
 * by a newer version) keeps synchronisation paused, with one message to update.
 */
export class CompatibilityReviewController {
    private pause: CompatibilityPause | undefined;
    private _initialised = false;
    private disposed = false;

    constructor(
        private readonly core: CompatibilityReviewDependencies,
        private readonly log: LogFunction,
        private readonly currentVersion: number = VER
    ) {}

    get pendingPause(): CompatibilityPause | undefined {
        return this.pause;
    }

    get initialised(): boolean {
        return this._initialised;
    }

    private async readAcknowledgedVersion(): Promise<string | null> {
        const setting = this.core.services.setting;
        const currentMarker = await this.core.services.config.getValue(DATABASE_COMPATIBILITY_VERSION_KEY, "");
        if (currentMarker) return currentMarker;

        const legacyKey = legacyDatabaseCompatibilityVersionKey(this.core.services.vault.getVaultName());
        const legacyMarker = await setting.deviceValues.getValue(legacyKey, "");
        if (!legacyMarker) return null;

        await this.core.services.config.setValue(DATABASE_COMPATIBILITY_VERSION_KEY, legacyMarker);
        await setting.deviceValues.delete(legacyKey);
        return legacyMarker;
    }

    async initialise(): Promise<boolean> {
        if (this.disposed) return true;
        const setting = this.core.services.setting;
        const settings = setting.currentSettings();
        const migrationState = setting.getSettingsMigrationState();

        // An unconfigured Vault cannot synchronise, so there is nothing to pause.
        if (settings.isConfigured !== true && migrationState?.isNewVault !== true) {
            this.pause = undefined;
            this._initialised = true;
            return true;
        }

        const acknowledgedVersion = await this.readAcknowledgedVersion();
        const evaluation = evaluateCompatibilityPause({
            acknowledgedVersion,
            currentVersion: this.currentVersion,
            migrationState,
            legacyReviewMessage: settings.versionUpFlash,
        });

        this.pause = evaluation.pause;
        if (evaluation.initialiseAcknowledgedVersion) {
            await this.core.services.config.setValue(DATABASE_COMPATIBILITY_VERSION_KEY, `${this.currentVersion}`);
        } else if (this.pause && settings.versionUpFlash === "") {
            settings.versionUpFlash = COMPATIBILITY_PAUSE_SETTING_MESSAGE;
            await setting.saveSettingData();
        }
        this._initialised = true;
        return true;
    }

    private async acknowledge(): Promise<void> {
        const setting = this.core.services.setting;
        const settings = setting.currentSettings();
        const previousMessage = settings.versionUpFlash;
        settings.versionUpFlash = "";
        try {
            await setting.saveSettingData();
        } catch (error) {
            settings.versionUpFlash = previousMessage || COMPATIBILITY_PAUSE_SETTING_MESSAGE;
            throw error;
        }

        await this.core.services.config.setValue(DATABASE_COMPATIBILITY_VERSION_KEY, `${this.currentVersion}`);
        const legacyKey = legacyDatabaseCompatibilityVersionKey(this.core.services.vault.getVaultName());
        await setting.deviceValues.delete(legacyKey);
        this.pause = undefined;
        await this.core.services.control.applySettings();
    }

    /** Resume a pause automatically, or report once that this device needs an update. */
    async settle(): Promise<void> {
        if (this.disposed || !this.pause) return;
        if (this.pause.resumable) {
            await this.acknowledge();
            this.log("Red Sync was updated; synchronisation continues as normal.", LOG_LEVEL_INFO);
            return;
        }
        this.log(
            "Synchronisation is paused because this vault's data was written by a newer version of Red Sync. Update Red Sync on this device.",
            LOG_LEVEL_URGENT
        );
    }

    dispose(): void {
        this.disposed = true;
        this.pause = undefined;
    }
}

export function useCompatibilityReview(core: CompatibilityReviewHost): CompatibilityReviewController {
    const log = createInstanceLogFunction("SF:CompatibilityReview", core.services.API);
    const controller = new CompatibilityReviewController(core, log);
    core.services.appLifecycle.onSettingLoaded.addHandler(() => controller.initialise());
    core.services.appLifecycle.onLayoutReady.addHandler(async () => {
        await controller.settle();
        return true;
    }, COMPATIBILITY_REVIEW_LAYOUT_PRIORITY);
    core.services.appLifecycle.onUnload.addHandler(() => {
        controller.dispose();
        return Promise.resolve(true);
    });
    return controller;
}
