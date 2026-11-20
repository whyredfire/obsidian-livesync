import { type App, type ButtonComponent, PluginSettingTab, Setting } from "@/deps.ts";
import type ObsidianLiveSyncPlugin from "@/main.ts";
import { FlagFilesHumanReadable, LOG_LEVEL_NOTICE } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { fireAndForget } from "@vrtmrz/livesync-commonlib/compat/common/utils";
import { createInstanceLogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import {
    REPLICATION_PROGRESS_PRESENTATIONS,
    USER_INITIATED_REPLICATION_AUTHORITY,
} from "@vrtmrz/livesync-commonlib/replication";
import { SetupManager } from "@/modules/features/SetupManager.ts";
import { setupFormValuesFrom } from "@/serviceFeatures/setupObsidian/setupForm.ts";
import { closeObsidianSettings } from "@/modules/coreObsidian/UI/obsidianSettings.ts";
import {
    getSilenceNotifications,
    getStatsForNerds,
    setSilenceNotifications,
    setStatsForNerds,
} from "@/modules/services/ObsidianSettingService.ts";
import { copySetupURI } from "@/serviceFeatures/setupObsidian/setupUri.ts";
import { encodeSetupSettingsAsQR } from "@/serviceFeatures/setupObsidian/qrCode.ts";
import { VIEW_TYPE_LOG } from "@/modules/features/Log/LogPaneView.ts";
import {
    isAutomaticSyncEnabled,
    isValidPeriodicSyncSeconds,
    MINIMUM_PERIODIC_SYNC_SECONDS,
    RED_SYNC_SYNC_TRIGGERS,
    RED_SYNC_SYNC_TRIGGERS_OFF,
} from "@/common/core/settings/newVaultSettings.ts";

/** Destructive styling without requiring Obsidian 1.13 at runtime. */
function setDestructive(button: ButtonComponent): ButtonComponent {
    const native = (button as unknown as { setDestructive?: () => ButtonComponent }).setDestructive;
    if (typeof native === "function") return native.call(button);
    button.buttonEl.classList.add("mod-warning");
    return button;
}

function describeEndpoint(endpoint: string): string {
    try {
        return new URL(endpoint).host;
    } catch {
        return endpoint;
    }
}

/**
 * The single settings page of Red Sync.
 *
 * Connection and encryption are edited through the setup dialogues, which test
 * the connection and decide whether this device should upload or fetch data.
 */
export class RedSyncSettingTab extends PluginSettingTab {
    private readonly log;

    constructor(
        app: App,
        private readonly plugin: ObsidianLiveSyncPlugin
    ) {
        super(app, plugin);
        this.log = createInstanceLogFunction("Settings", this.services.API);
    }

    private get core() {
        return this.plugin.core;
    }

    private get services() {
        return this.core.services;
    }

    private get setupManager() {
        return this.core.getModule(SetupManager);
    }

    /** Close the settings window, run a dialogue-based flow, and report failures. */
    private runFlow(flow: () => Promise<unknown>) {
        closeObsidianSettings(this.app);
        fireAndForget(async () => {
            try {
                await flow();
            } catch (error) {
                this.log(error, LOG_LEVEL_NOTICE);
            }
        });
    }

    private async scheduleAndRestart(flag: string, title: string, message: string, action: string) {
        const result = await this.core.confirm.askSelectStringDialogue(message, [action, "Cancel"], {
            title,
            defaultAction: "Cancel",
        });
        if (result !== action) return;
        await this.core.storageAccess.writeFileAuto(flag, "");
        this.services.appLifecycle.performRestart();
    }

    /** Reopen setup with the current connection filled in. */
    private changeConnection() {
        const values = setupFormValuesFrom(this.services.setting.currentSettings());
        this.runFlow(() => this.setupManager.startOnBoarding(values));
    }

    refresh(): void {
        if (this.containerEl.isShown()) this.display();
    }

    override display(): void {
        const { containerEl } = this;
        containerEl.empty();
        const settings = this.services.setting.currentSettings();
        const configured = !!settings.isConfigured && !!settings.endpoint?.trim() && !!settings.bucket?.trim();

        if (!configured) {
            new Setting(containerEl)
                .setName("Set up Red Sync")
                .setDesc(
                    "Connect this vault to a Cloudflare R2 bucket. If another device is already set up, you can import its setup URI instead."
                )
                .addButton((button) =>
                    button
                        .setButtonText("Start setup")
                        .setCta()
                        .onClick(() => this.runFlow(() => this.setupManager.startOnBoarding()))
                );
            return;
        }

        // Remote
        new Setting(containerEl).setName("Cloudflare R2").setHeading();
        const prefix = settings.bucketPrefix?.trim() ? `/${settings.bucketPrefix.trim()}` : "";
        new Setting(containerEl)
            .setName("Bucket")
            .setDesc(`${settings.bucket}${prefix} on ${describeEndpoint(settings.endpoint)}`)
            .addButton((button) =>
                button
                    .setButtonText("Change")
                    .onClick(() => this.changeConnection())
            );

        new Setting(containerEl)
            .setName("Bucket size warning")
            .setDesc("Warn when the data in the bucket grows beyond this many megabytes. 0 means no warning.")
            .addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.min = "0";
                text.inputEl.step = "100";
                text.setPlaceholder("0").setValue(String(Math.max(0, settings.notifyThresholdOfRemoteStorageSize)));
                text.inputEl.addEventListener("change", () => {
                    const megabytes = Number(text.getValue());
                    if (!Number.isInteger(megabytes) || megabytes < 0) {
                        text.setValue(
                            String(
                                Math.max(0, this.services.setting.currentSettings().notifyThresholdOfRemoteStorageSize)
                            )
                        );
                        return;
                    }
                    fireAndForget(() =>
                        this.services.setting.applyPartial({ notifyThresholdOfRemoteStorageSize: megabytes }, true)
                    );
                });
            });

        // Encryption
        new Setting(containerEl).setName("Encryption").setHeading();
        const encryptionStatus = settings.encrypt
            ? settings.usePathObfuscation
                ? "On. File paths are obfuscated."
                : "On. File paths are visible in the bucket."
            : "Off. Notes are stored in the bucket without encryption.";
        new Setting(containerEl)
            .setName("End-to-end encryption")
            .setDesc(encryptionStatus)
            .addButton((button) =>
                button
                    .setButtonText("Change")
                    .onClick(() => this.changeConnection())
            );

        // Synchronisation
        new Setting(containerEl).setName("Synchronisation").setHeading();
        new Setting(containerEl)
            .setName("Automatic sync")
            .setDesc(
                "Synchronise at start-up, when a file is opened, a few seconds after changes are saved, and on the schedule below."
            )
            .addToggle((toggle) =>
                toggle.setValue(isAutomaticSyncEnabled(settings)).onChange((enabled) =>
                    fireAndForget(async () => {
                        await this.services.setting.applyPartial(
                            enabled ? RED_SYNC_SYNC_TRIGGERS : RED_SYNC_SYNC_TRIGGERS_OFF,
                            true
                        );
                        await this.services.control.applySettings();
                    })
                )
            );
        new Setting(containerEl)
            .setName("Sync every")
            .setDesc(
                `Also synchronise every this many seconds while automatic sync is on, so changes from other devices arrive without opening a file. 0 means only on the events above. The minimum is ${MINIMUM_PERIODIC_SYNC_SECONDS} seconds.`
            )
            .addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.min = "0";
                text.inputEl.step = "10";
                const current = () => String(Math.max(0, this.services.setting.currentSettings().periodicReplicationInterval));
                text.setPlaceholder("0").setValue(current());
                text.inputEl.addEventListener("change", () => {
                    const seconds = Number(text.getValue());
                    if (!isValidPeriodicSyncSeconds(seconds)) {
                        text.setValue(current());
                        return;
                    }
                    fireAndForget(() =>
                        this.services.setting.applyPartial({ periodicReplicationInterval: seconds }, true)
                    );
                });
            });
        new Setting(containerEl)
            .setName("Sync now")
            .setDesc("Synchronise with the bucket immediately.")
            .addButton((button) =>
                button.setButtonText("Sync now").onClick(() =>
                    fireAndForget(() =>
                        this.services.replication.replicateUserInitiated({
                            trigger: "manual",
                            progressPresentation: REPLICATION_PROGRESS_PRESENTATIONS.NOTICE,
                            interaction: USER_INITIATED_REPLICATION_AUTHORITY,
                        })
                    )
                )
            );

        new Setting(containerEl)
            .setName("Silence notifications")
            .setDesc(
                "Show no pop-up notifications on this device, not even errors or 'Red Sync is ready'. Everything is still recorded in the log."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(getSilenceNotifications(this.services.setting))
                    .onChange((enabled) => fireAndForget(() => setSilenceNotifications(this.services.setting, enabled)))
            );

        // Other devices
        new Setting(containerEl).setName("Set up another device").setHeading();
        new Setting(containerEl)
            .setName("Copy setup URI")
            .setDesc(
                "Copy a link which configures another device with the same bucket and encryption settings. It is protected with a passphrase you choose."
            )
            .addButton((button) =>
                button.setButtonText("Copy").onClick(() => fireAndForget(() => copySetupURI(this.core)))
            );
        new Setting(containerEl)
            .setName("Show QR code")
            .setDesc("Scan this code with another device to configure it.")
            .addButton((button) =>
                button.setButtonText("Show").onClick(() => fireAndForget(() => encodeSetupSettingsAsQR(this.core)))
            );

        // Recovery
        new Setting(containerEl).setName("Recovery").setHeading();
        new Setting(containerEl)
            .setName("Fetch everything from R2")
            .setDesc(
                "Download everything from the bucket again and merge it with this vault: the newer copy of each note wins and notes which exist only here are kept. Obsidian restarts to do this."
            )
            .addButton((button) =>
                button
                    .setButtonText("Fetch")
                    .onClick(() =>
                        fireAndForget(() =>
                            this.scheduleAndRestart(
                                FlagFilesHumanReadable.FETCH_ALL,
                                "Fetch everything from R2",
                                "Obsidian will restart and download everything from the bucket again. Notes on this device are merged: the newer copy of each note wins and notes which exist only here are kept.",
                                "Restart and fetch"
                            )
                        )
                    )
            );
        new Setting(containerEl)
            .setName("Overwrite R2 with this device")
            .setDesc(
                "Delete the data in the bucket and upload this vault as the master copy. Other devices must fetch again afterwards."
            )
            .addButton((button) =>
                setDestructive(button)
                    .setButtonText("Overwrite")
                    .onClick(() =>
                        fireAndForget(() =>
                            this.scheduleAndRestart(
                                FlagFilesHumanReadable.REBUILD_ALL,
                                "Overwrite R2 with this device",
                                "After a restart, the data in the bucket will be replaced with the contents of this vault. Changes which exist only on other devices may be lost. Back up your vault first.",
                                "Restart and overwrite"
                            )
                        )
                    )
            );

        // Developer
        new Setting(containerEl).setName("Developer").setHeading();
        new Setting(containerEl)
            .setName("Show stats for nerds")
            .setDesc(
                "Show synchronisation statistics in the status bar and the editor, and show progress notifications. When off, only important messages appear; everything is still recorded in the log."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(getStatsForNerds(this.services.setting))
                    .onChange((enabled) => fireAndForget(() => setStatsForNerds(this.services.setting, enabled)))
            );
        new Setting(containerEl)
            .setName("Log")
            .setDesc("Show the synchronisation log, which is useful when something does not work.")
            .addButton((button) =>
                button.setButtonText("Show log").onClick(() => {
                    closeObsidianSettings(this.app);
                    void this.services.API.showWindow(VIEW_TYPE_LOG);
                })
            );
    }
}
