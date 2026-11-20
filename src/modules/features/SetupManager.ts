import {
    type BucketSyncSetting,
    type ObsidianLiveSyncSettings,
    LOG_LEVEL_NOTICE,
    LOG_LEVEL_VERBOSE,
    REMOTE_MINIO,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { normaliseAcceptUnencryptedContent } from "@vrtmrz/livesync-commonlib/settings";
import { createNewVaultSettings } from "@/common/core/settings/newVaultSettings";
import { upsertRemoteConfigurationInPlace } from "@vrtmrz/livesync-commonlib/remote-configurations";
import { ConnectionStringParser } from "@vrtmrz/livesync-commonlib/compat/common/ConnectionString";
import { isObjectDifferent } from "@vrtmrz/livesync-commonlib/compat/common/utils";
import SetupStart from "./SetupWizard/dialogs/SetupStart.svelte";
import SetupForm from "./SetupWizard/dialogs/SetupForm.svelte";
import UseSetupURI from "./SetupWizard/dialogs/UseSetupURI.svelte";
import OutroNewUser from "./SetupWizard/dialogs/OutroNewUser.svelte";
import OutroExistingUser from "./SetupWizard/dialogs/OutroExistingUser.svelte";
import OutroAskUserMode from "./SetupWizard/dialogs/OutroAskUserMode.svelte";
import ApplySettingsInitialisation from "./SetupWizard/dialogs/ApplySettingsInitialisation.svelte";
import SetupRemoteBucket from "./SetupWizard/dialogs/SetupRemoteBucket.svelte";
import SetupRemoteE2EE from "./SetupWizard/dialogs/SetupRemoteE2EE.svelte";
import { decodeSettingsFromQRCodeData } from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { AbstractModule } from "@/modules/AbstractModule.ts";
import { $msg } from "@/common/translation";
import type {
    OutroAskUserModeResultType,
    OutroExistingUserResultType,
    OutroNewUserResultType,
    SetupFormInitialData,
    SetupFormResultType,
    SetupPreparation,
    SetupStartResultType,
    SetupRemoteBucketResultType,
    SetupRemoteE2EEResultType,
    SetupRemoteE2EEInitialData,
    UseSetupURIResultType,
    ApplySettingsInitialisationResultType,
    OutroApplyInitialData,
} from "./SetupWizard/dialogs/setupDialogTypes.ts";
import {
    applySettingsAndFetchOnActivation,
    applySettingsWithScheduledInitialisation,
    type SetupInitialisationMode,
} from "@/serviceFeatures/setupObsidian/setupActivationLifecycle.ts";
import { REMOTE_RESOURCE_KINDS } from "@vrtmrz/livesync-commonlib/replication";
import { resolveInitialPathIdentity } from "@/common/core/replication/initialPathIdentity";
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
 * User modes for onboarding and setup
 */
export const enum UserMode {
    /**
     * New User Mode - for users who are new to the plugin
     */
    NewUser = "new-user",
    /**
     * Existing User Mode - for users who have used the plugin before, or just configuring again
     */
    ExistingUser = "existing-user",
    /**
     * Unknown User Mode - for cases where the user mode is not determined
     */
    Unknown = "unknown",
    /**
     * Update User Mode - for users who are updating configuration. May be `existing-user` as well, but possibly they want to treat it differently.
     */
    // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values -- Update is a semantic alias for the unknown setup mode.
    Update = "unknown", // Alias for Unknown for better readability
}

export type SettingsInitialisationApplicationResult =
    | { result: "scheduled"; mode: SetupInitialisationMode }
    | { result: "cancelled" }
    | { result: "failed"; mode: SetupInitialisationMode };

export type ApplySettingsWithInitialisationChoiceOptions = {
    applySettings: () => Promise<void>;
    validateChoice?: (mode: SetupInitialisationMode) => Promise<boolean>;
};

/**
 * Setup Manager to handle onboarding and configuration setup
 */
export class SetupManager extends AbstractModule {
    // /**
    //  * Dialog manager for handling Svelte dialogs
    //  */
    // private dialogManager: SvelteDialogManager = new SvelteDialogManager(this.plugin);
    get dialogManager() {
        return this.services.UI.dialogManager;
    }

    /**
     * Ask which existing data should be authoritative for pending setting changes,
     * then reserve the matching next-start operation before applying them.
     *
     * Cancellation and reservation failure remain distinct so the caller may
     * offer an explicit settings-only fallback only after a user cancellation.
     */
    async applySettingsWithInitialisationChoice({
        applySettings,
        validateChoice = () => Promise.resolve(true),
    }: ApplySettingsWithInitialisationChoiceOptions): Promise<SettingsInitialisationApplicationResult> {
        const mode =
            await this.dialogManager.openWithExplicitCancel<ApplySettingsInitialisationResultType>(
                ApplySettingsInitialisation
            );
        if (mode === "cancelled") {
            return { result: "cancelled" };
        }
        if (!(await validateChoice(mode))) {
            return { result: "failed", mode };
        }
        const scheduled = await applySettingsWithScheduledInitialisation(this.core.rebuilder, mode, applySettings);
        return scheduled ? { result: "scheduled", mode } : { result: "failed", mode };
    }

    /**
     * Starts the initial setup: choose how to start, then fill in one form.
     * @returns Promise that resolves to true if the setup was applied (Obsidian then restarts)
     */
    async startOnBoarding(): Promise<boolean> {
        const choice = await this.dialogManager.openWithExplicitCancel<SetupStartResultType>(SetupStart);
        if (choice === "new" || choice === "join") return await this.runSetupForm(choice);
        if (choice === "uri") return await this.onUseSetupURI(UserMode.ExistingUser);
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
        if (result === "back") return await this.startOnBoarding();
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
                    await this.applySetting(newConf, mode === "new" ? UserMode.NewUser : UserMode.ExistingUser);
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

    async onUseSetupURI(userMode: UserMode, setupURI: string = ""): Promise<boolean> {
        const newSetting = await this.dialogManager.openWithExplicitCancel<UseSetupURIResultType, string>(
            UseSetupURI,
            setupURI
        );
        if (newSetting === "cancelled") {
            this._log("Setup URI dialog cancelled.", LOG_LEVEL_NOTICE);
            return false;
        }
        this._log("Setup URI dialog closed.", LOG_LEVEL_VERBOSE);
        if (!this.isSupportedImport(newSetting)) return false;
        if (!this.settings.isConfigured) {
            return await this.completeSetup(normaliseCompleteImportedSettings(newSetting), "join", { imported: true });
        }
        return await this.onConfirmApplySettingsFromWizard(normaliseCompleteImportedSettings(newSetting), userMode);
    }

    /**
     * Handles manual setup for S3-compatible bucket
     * @param userMode
     * @param currentSetting
     * @param activate Whether to activate the Bucket as remote type
     * @returns Promise that resolves to true if setup completed successfully, false otherwise
     */
    async onBucketManualSetup(
        userMode: UserMode,
        currentSetting: ObsidianLiveSyncSettings,
        activate = true
    ): Promise<boolean> {
        const bucketConf = await this.dialogManager.openWithExplicitCancel<
            SetupRemoteBucketResultType,
            BucketSyncSetting
        >(SetupRemoteBucket, currentSetting);
        if (bucketConf === "cancelled") {
            this._log("Manual configuration cancelled.", LOG_LEVEL_VERBOSE);
            return false;
        }
        const newSetting = {
            ...copySettingsForRemoteProfileUpdate(currentSetting),
            ...bucketConf,
        } as ObsidianLiveSyncSettings;
        if (activate) {
            newSetting.remoteType = REMOTE_MINIO;
        }
        if (!(await this.selectInitialPathIdentity(newSetting, userMode, activate))) return false;
        upsertRemoteConfigurationInPlace(newSetting, "s3", { activate });
        return await this.onConfirmApplySettingsFromWizard(newSetting, userMode, activate);
    }

    private async selectInitialPathIdentity(
        settings: ObsidianLiveSyncSettings,
        userMode: UserMode,
        activate: boolean
    ): Promise<boolean> {
        if (!activate || (userMode !== UserMode.NewUser && userMode !== UserMode.ExistingUser)) return true;
        try {
            const probe = await this.services.replicator.createRemoteResource(
                REMOTE_RESOURCE_KINDS.CONNECTION,
                settings
            );
            settings.pathNormalizationVersion = await resolveInitialPathIdentity(
                probe,
                settings.pathNormalizationVersion
            );
            return true;
        } catch (error) {
            this._log(
                "The remote path identity could not be inspected. Settings have not been applied.",
                LOG_LEVEL_NOTICE
            );
            this._log(error, LOG_LEVEL_VERBOSE);
            return false;
        }
    }

    /**
     * Handles only E2EE configuration
     * @param userMode
     * @param currentSetting
     * @returns
     */
    async onlyE2EEConfiguration(userMode: UserMode, currentSetting: ObsidianLiveSyncSettings): Promise<boolean> {
        const e2eeConf = await this.dialogManager.openWithExplicitCancel<
            SetupRemoteE2EEResultType,
            SetupRemoteE2EEInitialData
        >(SetupRemoteE2EE, { settings: currentSetting, newVault: userMode === UserMode.NewUser });
        if (e2eeConf === "cancelled") {
            this._log("E2EE configuration cancelled.", LOG_LEVEL_NOTICE);
            return false;
        }
        const internalMetadataPreferenceChanged =
            currentSetting.encryptInternalMetadata !== e2eeConf.encryptInternalMetadata;
        const plaintextReceiptPreferenceChanged =
            normaliseAcceptUnencryptedContent(currentSetting.acceptUnencryptedContent) !==
            normaliseAcceptUnencryptedContent(e2eeConf.acceptUnencryptedContent);
        const onlyE2EEPreferenceChanges =
            (internalMetadataPreferenceChanged || plaintextReceiptPreferenceChanged) &&
            currentSetting.encrypt === e2eeConf.encrypt &&
            currentSetting.passphrase === e2eeConf.passphrase &&
            currentSetting.E2EEAlgorithm === e2eeConf.E2EEAlgorithm &&
            currentSetting.usePathObfuscation === e2eeConf.usePathObfuscation &&
            currentSetting.idDerivationVersion === e2eeConf.idDerivationVersion &&
            currentSetting.idDerivationKey === e2eeConf.idDerivationKey;
        if (userMode === UserMode.Update && onlyE2EEPreferenceChanges) {
            const partial: Partial<ObsidianLiveSyncSettings> = {};
            if (internalMetadataPreferenceChanged) {
                partial.encryptInternalMetadata = e2eeConf.encryptInternalMetadata;
            }
            if (plaintextReceiptPreferenceChanged) {
                partial.acceptUnencryptedContent = normaliseAcceptUnencryptedContent(e2eeConf.acceptUnencryptedContent);
            }
            await this.services.setting.applyPartial(partial, true);
            return true;
        }
        const newSetting = {
            ...currentSetting,
            ...e2eeConf,
        } as ObsidianLiveSyncSettings;
        return await this.onConfirmApplySettingsFromWizard(newSetting, userMode);
    }

    /**
     * Confirms and applies settings obtained from the wizard
     * @param newConf
     * @param _userMode
     * @param activate Whether to activate the remote type in the new settings
     * @param extra  Extra function to run before applying settings
     * @returns Promise that resolves to true if settings applied successfully, false otherwise
     */
    async onConfirmApplySettingsFromWizard(
        newConf: ObsidianLiveSyncSettings,
        _userMode: UserMode,
        activate: boolean = true,
        extra: () => void = () => {}
    ): Promise<boolean> {
        newConf = await this.services.setting.adjustSettings(
            copySettingsForRemoteProfileUpdate({ ...this.settings, ...newConf })
        );
        const enableUnencryptedContent =
            newConf.encrypt === true &&
            normaliseAcceptUnencryptedContent(newConf.acceptUnencryptedContent) &&
            !(
                this.settings.encrypt === true &&
                normaliseAcceptUnencryptedContent(this.settings.acceptUnencryptedContent)
            );
        let userMode = _userMode;
        if (userMode === UserMode.Unknown) {
            if (isObjectDifferent(this.settings, newConf, true) === false) {
                this._log("No changes in settings detected. Skipping applying settings from wizard.", LOG_LEVEL_NOTICE);
                return true;
            }
            // const patch = generatePatchObj(this.settings, newConf);
            // console.log(`Changes:`);
            // console.dir(patch);
            if (!activate) {
                extra();
                const applied = await this.applySettingAndScheduleFetchOnActivation(newConf, UserMode.ExistingUser);
                if (applied) this._log("Setting Applied", LOG_LEVEL_NOTICE);
                return applied;
            }
            const userModeResult = await this.dialogManager.openWithExplicitCancel<
                OutroAskUserModeResultType,
                OutroApplyInitialData
            >(OutroAskUserMode, { enableUnencryptedContent });
            if (userModeResult === "new-user") {
                userMode = UserMode.NewUser;
            } else if (userModeResult === "existing-user") {
                userMode = UserMode.ExistingUser;
            } else if (userModeResult === "compatible-existing-user") {
                extra();
                const applied = await this.applySettingAndScheduleFetchOnActivation(newConf, UserMode.ExistingUser);
                if (applied) this._log("Settings from wizard applied.", LOG_LEVEL_NOTICE);
                return applied;
            } else if (userModeResult === "cancelled") {
                this._log("User cancelled applying settings from wizard.", LOG_LEVEL_NOTICE);
                return false;
            }
        }
        const initialData = { enableUnencryptedContent };
        const confirm =
            userMode === UserMode.NewUser
                ? await this.dialogManager.openWithExplicitCancel<OutroNewUserResultType, OutroApplyInitialData>(
                      OutroNewUser,
                      initialData
                  )
                : await this.confirmAdditionalDeviceRestart(initialData);
        if (confirm === "cancelled") {
            this._log("User cancelled applying settings from wizard..", LOG_LEVEL_NOTICE);
            return false;
        }
        if (confirm) {
            extra();
            if (userMode === UserMode.NewUser) {
                // Reserve Rebuild before enabling the imported settings, so
                // the current runtime cannot begin ordinary processing first.
                await applySettingsWithScheduledInitialisation(this.core.rebuilder, "rebuild", async () => {
                    await this.applySetting(newConf, userMode);
                });
            } else {
                // Existing data must be fetched before the ordinary startup scan.
                await applySettingsWithScheduledInitialisation(this.core.rebuilder, "fetch", async () => {
                    await this.applySetting(newConf, userMode);
                });
            }
        }
        // Settings applied, but may require rebuild to take effect.
        return false;
    }

    private async confirmAdditionalDeviceRestart(
        initialData: OutroApplyInitialData
    ): Promise<OutroExistingUserResultType> {
        const review = await this.dialogManager.openWithExplicitCancel<
            OutroExistingUserResultType,
            OutroApplyInitialData
        >(OutroExistingUser, initialData);
        if (review !== "apply") {
            return "cancelled";
        }

        const title = $msg("Ui.SetupWizard.OutroExistingUser.RestartConfirmationTitle");
        const message = $msg("Ui.SetupWizard.OutroExistingUser.FetchSyncGuidance");
        const restart = $msg("Restart and Fetch Data");
        const action = await this.core.confirm.confirmWithMessage(title, message, [restart, $msg("Cancel")], restart);
        return action === restart ? "apply" : "cancelled";
    }

    /**
     * Decodes settings from a QR code string and applies them
     * @param qr QR code string containing encoded settings
     * @returns Promise that resolves to true if settings applied successfully, false otherwise
     */
    async decodeQR(qr: string) {
        let newSettings: ObsidianLiveSyncSettings;
        try {
            newSettings = normaliseCompleteImportedSettings(decodeSettingsFromQRCodeData(qr));
        } catch {
            this._log("The QR configuration could not be decoded or contains unsupported settings.", LOG_LEVEL_NOTICE);
            return false;
        }
        if (!this.isSupportedImport(newSettings)) return false;
        if (!this.settings.isConfigured) {
            return await this.completeSetup(newSettings, "join", { imported: true });
        }
        return await this.onConfirmApplySettingsFromWizard(newSettings, UserMode.Unknown);
    }

    /**
     * Applies the new settings to the core settings and saves them
     * @param newConf
     * @param userMode
     * @returns Promise that resolves to true if settings applied successfully, false otherwise
     */
    async applySetting(newConf: ObsidianLiveSyncSettings, userMode: UserMode) {
        this.services.setting.clearUsedPassphrase();
        await this.services.setting.applyExternalSettings(newConf, true);
        return true;
    }

    private async applySettingAndScheduleFetchOnActivation(
        newConf: ObsidianLiveSyncSettings,
        userMode: UserMode
    ): Promise<boolean> {
        const wasConfigured = this.settings.isConfigured;
        return await applySettingsAndFetchOnActivation(
            this.core.rebuilder,
            wasConfigured,
            newConf.isConfigured,
            async () => {
                await this.applySetting(newConf, userMode);
            }
        );
    }
}
