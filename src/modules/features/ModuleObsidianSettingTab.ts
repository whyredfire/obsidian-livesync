import { RedSyncSettingTab } from "./SettingDialogue/RedSyncSettingTab.ts";
import { AbstractObsidianModule } from "@/modules/AbstractObsidianModule.ts";
import { EVENT_REQUEST_OPEN_SETTINGS, EVENT_REQUEST_RELOAD_SETTING_TAB, eventHub } from "@/common/events.ts";
import type { LiveSyncCore } from "@/main.ts";
import { openObsidianSettings } from "@/modules/coreObsidian/UI/obsidianSettings.ts";

export class ModuleObsidianSettingDialogue extends AbstractObsidianModule {
    settingTab!: RedSyncSettingTab;

    _everyOnloadAfterLoadSettings(): Promise<boolean> {
        this.settingTab = new RedSyncSettingTab(this.app, this.plugin);
        this.plugin.addSettingTab(this.settingTab);
        eventHub.onEvent(EVENT_REQUEST_OPEN_SETTINGS, () => this.openSetting());
        eventHub.onEvent(EVENT_REQUEST_RELOAD_SETTING_TAB, () => this.settingTab.refresh());
        return Promise.resolve(true);
    }

    openSetting() {
        openObsidianSettings(this.app, this.plugin.manifest.id);
    }

    override onBindFunction(core: LiveSyncCore, services: typeof core.services): void {
        services.appLifecycle.onSettingLoaded.addHandler(this._everyOnloadAfterLoadSettings.bind(this));
    }
}
