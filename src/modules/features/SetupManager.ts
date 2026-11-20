import {
    type ObsidianLiveSyncSettings,
    LOG_LEVEL_NOTICE,
    LOG_LEVEL_VERBOSE,
    REMOTE_MINIO,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { normaliseAcceptUnencryptedContent } from "@vrtmrz/livesync-commonlib/settings";
import { createNewVaultSettings } from "@/common/core/settings/newVaultSettings";
import { upsertRemoteConfigurationInPlace } from "@vrtmrz/livesync-commonlib/remote-configurations";
import { ConnectionStringParser } from "@vrtmrz/livesync-commonlib/compat/common/ConnectionString";
import SetupStart from "./SetupWizard/dialogs/SetupStart.svelte";
import SetupForm from "./SetupWizard/dialogs/SetupForm.svelte";
import UseSetupURI from "./SetupWizard/dialogs/UseSetupURI.svelte";
import { decodeSettingsFromQRCodeData } from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { AbstractModule } from "@/modules/AbstractModule.ts";
import type {
    SetupFormInitialData,
    SetupFormResultType,
    SetupPreparation,
    SetupStartResultType,
    UseSetupURIResultType,
} from "./SetupWizard/dialogs/setupDialogTypes.ts";
import { applySettingsWithScheduledInitialisation } from "@/serviceFeatures/setupObsidian/setupActivationLifecycle.ts";
import { REMOTE_RESOURCE_KINDS } from "@vrtmrz/livesync-commonlib/replication";
import { withOwnedRemoteResource } from "@/common/core/replication/ownedRemoteResource";
import {
    buildSetupSettings,
    emptySetupFormValues,
    type SetupFormValues,
    type SetupMode,
} from "@/serviceFeatures/setupObsidian/setupForm";
import { clearPendingSetup, markPendingSetup } from "@/serviceFeatures/setupObsidian/pendingSetup";

function copySettingsForRemoteProfileUpdate(settings: ObsidianLiveSyncSettings): ObsidianLiveSyncSettings {
    return {
        ...settings,
        remoteConfigurations: { ...(settings.remoteConfigurations ?? {}) },
    };
}

function normaliseCompleteImportedSettings(settings: ObsidianLiveSyncSettings): ObsidianLiveSyncSettings {
    // Setup URIs are complete imports even when their encoder omitted default-valued fields.
    // Fill each missing half so a receiving device cannot supply the unrelated saved key.
    return {
        ...settings,
        pathNormalizationVersion: Object.prototype.hasOwnProperty.call(settings, "pathNormalizationVersion")
            ? settings.pathNormalizationVersion
            : 0,
        idDerivationVersion: Object.prototype.hasOwnProperty.call(settings, "idDerivationVersion")
            ? settings.idDerivationVersion
            : 0,
        idDerivationKey: Object.prototype.hasOwnProperty.call(settings, "idDerivationKey")
            ? settings.idDerivationKey
            : "",
        // Do not inherit a destination's preference when a complete import omits this newer field.
        acceptUnencryptedContent: normaliseAcceptUnencryptedContent(settings.acceptUnencryptedContent),
    };
}

/**
 * Setup and connection changes. Everything goes through two screens: choose how
 * to start (new sync, join, or setup URI), then one form. After that Obsidian
 * restarts into the upload or download without further questions.
 */
export class SetupManager extends AbstractModule {
    get dialogManager() {
        return this.services.UI.dialogManager;
    }

    /**
     * Start setup, or change the connection of a configured device.
     * @param values Form values to start from, such as the current connection.
     * @returns true if settings were applied (Obsidian then restarts).
     */
    async startOnBoarding(values: SetupFormValues = emptySetupFormValues()): Promise<boolean> {
        const choice = await this.dialogManager.openWithExplicitCancel<SetupStartResultType>(SetupStart);
        if (choice === "new" || choice === "join") return await this.runSetupForm(choice, values);
        if (choice === "uri") return await this.onUseSetupURI();
        this._log("Setup cancelled.", LOG_LEVEL_VERBOSE);
        return false;
    }

    /** Show the single setup form and apply its result. */
    async runSetupForm(mode: SetupMode, values: SetupFormValues = emptySetupFormValues()): Promise<boolean> {
        const base = createNewVaultSettings();
        const result = await this.dialogManager.openWithExplicitCancel<SetupFormResultType, SetupFormInitialData>(
            SetupForm,
            { mode, values, prepare: (formValues) => this.prepareSetup(base, formValues, mode) }
        );
        if (result === "back") return await this.startOnBoarding(values);
        if (result === "cancelled") {
            this._log("Setup cancelled.", LOG_LEVEL_VERBOSE);
            return false;
        }
        return await this.completeSetup(result.settings, mode);
    }

    /**
     * Test the connection and inspect the bucket before anything is applied.
     * Joining an empty bucket is refused; starting a new sync over existing data needs a second confirmation.
     */
    async prepareSetup(
        base: ObsidianLiveSyncSettings,
        values: SetupFormValues,
        mode: SetupMode
    ): Promise<SetupPreparation> {
        const settings = await buildSetupSettings(base, values);
        const unreachable = "Could not connect to the bucket. Check the endpoint, keys, and bucket name.";
        const connection = await this.services.replicator.createRemoteResource(
            REMOTE_RESOURCE_KINDS.CONNECTION,
            settings
        );
        if (!connection) return { status: "error", message: unreachable };
        const checked = await withOwnedRemoteResource(connection, (probe) =>
            probe.check({ createIfMissing: mode === "new", showResult: false })
        );
        if (!checked.ok) return { status: "error", message: unreachable };

        const inspector = await this.services.replicator.createRemoteResource(
            REMOTE_RESOURCE_KINDS.CONNECTION,
            settings
        );
        const inspection = await withOwnedRemoteResource(
            inspector!,
            async (probe) => await probe.inspectPathIdentity?.()
        );
        const bucketIsEmpty = inspection === undefined || inspection.status === "empty";
        if (!bucketIsEmpty && inspection) {
            settings.pathNormalizationVersion = inspection.pathNormalizationVersion;
        }
        if (mode === "join" && bucketIsEmpty) {
            return {
                status: "error",
                message:
                    "This bucket has no Red Sync data yet. On the device that has your notes, choose Start a new sync first.",
            };
        }
        if (mode === "new" && !bucketIsEmpty) {
            return {
                status: "confirm",
                message:
                    "This bucket already contains synced notes. Uploading this vault will replace them for every device.",
                confirmLabel: "Replace and upload",
                settings,
            };
        }
        return { status: "ok", settings };
    }

    /**
     * Apply settings from the setup form or a setup URI and restart into the
     * upload (new) or download (join). No further confirmation is asked, and
     * automatic synchronisation switches on when the operation completes.
     */
    async completeSetup(
        settings: ObsidianLiveSyncSettings,
        mode: SetupMode,
        options: { imported?: boolean } = {}
    ): Promise<boolean> {
        const prepared = {
            ...copySettingsForRemoteProfileUpdate({ ...this.settings, ...settings }),
            isConfigured: true,
        };
        if (!options.imported) upsertRemoteConfigurationInPlace(prepared, "s3", { activate: true });
        const newConf = await this.services.setting.adjustSettings(prepared);
        await markPendingSetup(this.core, mode);
        try {
            const scheduled = await applySettingsWithScheduledInitialisation(
                this.core.rebuilder,
                mode === "new" ? "rebuild" : "fetch",
                async () => {
                    await this.applySetting(newConf);
                }
            );
            if (!scheduled) await clearPendingSetup(this.core);
            return scheduled;
        } catch (error) {
            await clearPendingSetup(this.core);
            throw error;
        }
    }

    /** Red Sync can use only an S3-compatible (Cloudflare R2) remote. */
    private isSupportedImport(settings: ObsidianLiveSyncSettings): boolean {
        const activeId = settings.activeConfigurationId?.trim();
        const active = activeId ? settings.remoteConfigurations?.[activeId] : undefined;
        let supported = settings.remoteType === REMOTE_MINIO;
        if (active && !active.isEncrypted) {
            try {
                supported = ConnectionStringParser.parse(active.uri).type === "s3";
            } catch {
                supported = false;
            }
        } else if (active) {
            // An encrypted profile cannot be inspected before it is unlocked.
            supported = true;
        }
        if (supported) return true;
        this._log(
            "These settings do not contain a Cloudflare R2 (S3) connection, which is the only remote Red Sync supports.",
            LOG_LEVEL_NOTICE
        );
        return false;
    }

    /** Import a setup URI and download from its bucket. */
    async onUseSetupURI(setupURI: string = ""): Promise<boolean> {
        const newSetting = await this.dialogManager.openWithExplicitCancel<UseSetupURIResultType, string>(
            UseSetupURI,
            setupURI
        );
        if (newSetting === "cancelled") {
            this._log("Setup URI dialogue cancelled.", LOG_LEVEL_VERBOSE);
            return false;
        }
        if (!this.isSupportedImport(newSetting)) return false;
        return await this.completeSetup(normaliseCompleteImportedSettings(newSetting), "join", { imported: true });
    }

    /** Import settings from a scanned QR code and download from its bucket. */
    async decodeQR(qr: string) {
        let newSettings: ObsidianLiveSyncSettings;
        try {
            newSettings = normaliseCompleteImportedSettings(decodeSettingsFromQRCodeData(qr));
        } catch {
            this._log("The QR configuration could not be decoded or contains unsupported settings.", LOG_LEVEL_NOTICE);
            return false;
        }
        if (!this.isSupportedImport(newSettings)) return false;
        return await this.completeSetup(newSettings, "join", { imported: true });
    }

    /** Apply new settings to the core settings and save them. */
    async applySetting(newConf: ObsidianLiveSyncSettings) {
        this.services.setting.clearUsedPassphrase();
        await this.services.setting.applyExternalSettings(newConf, true);
        return true;
    }
}
