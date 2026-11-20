import { type ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import {
    EVENT_REQUEST_RELOAD_SETTING_TAB,
    EVENT_SETTING_SAVED,
} from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import {
    SettingService,
    type SettingServiceDependencies,
} from "@vrtmrz/livesync-commonlib/compat/services/base/SettingService";
import type { ObsidianServiceContext } from "@/modules/services/ObsidianServiceContext";
import { RED_SYNC_ENFORCED_SETTINGS } from "@/common/core/settings/newVaultSettings";

export function normaliseObsidianSettingsData(data: unknown): ObsidianLiveSyncSettings | undefined {
    if (typeof data !== "object" || data === null || Array.isArray(data)) return undefined;
    return data as ObsidianLiveSyncSettings;
}

export class ObsidianSettingService<T extends ObsidianServiceContext> extends SettingService<T> {
    constructor(context: T, dependencies: SettingServiceDependencies) {
        super(context, dependencies);
        this.onSettingSaved.addHandler((settings) => {
            this.context.events.emitEvent(EVENT_SETTING_SAVED, settings);
            return Promise.resolve(true);
        });
        this.onSettingLoaded.addHandler(() => {
            this.context.events.emitEvent(EVENT_REQUEST_RELOAD_SETTING_TAB);
            return Promise.resolve(true);
        });
    }

    /** Red Sync supports only Cloudflare R2 with a fixed synchronisation behaviour. */
    override async adjustSettings(settings: ObsidianLiveSyncSettings): Promise<ObsidianLiveSyncSettings> {
        const adjusted = await super.adjustSettings(settings);
        Object.assign(adjusted, RED_SYNC_ENFORCED_SETTINGS);
        return adjusted;
    }

    protected override async saveData(data: ObsidianLiveSyncSettings): Promise<void> {
        return await this.context.liveSyncPlugin.saveData(data);
    }

    protected override async loadData(): Promise<ObsidianLiveSyncSettings | undefined> {
        return normaliseObsidianSettingsData(await this.context.liveSyncPlugin.loadData());
    }
}
