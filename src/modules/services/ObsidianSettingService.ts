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
import { EVENT_STATS_FOR_NERDS_CHANGED } from "@/common/events.ts";

const STATS_FOR_NERDS_KEY = "redSyncStatsForNerds";
const SILENCE_NOTIFICATIONS_KEY = "redSyncSilenceNotifications";

/** Whether detailed notifications and synchronisation statistics are shown on this device. */
export function getStatsForNerds(setting: SettingService<ObsidianServiceContext>): boolean {
    return (setting as Partial<ObsidianSettingService<ObsidianServiceContext>>).statsForNerds === true;
}

export async function setStatsForNerds(
    setting: SettingService<ObsidianServiceContext>,
    enabled: boolean
): Promise<void> {
    await (setting as ObsidianSettingService<ObsidianServiceContext>).setStatsForNerds(enabled);
}

/** Whether Red Sync shows no notices at all on this device. */
export function getSilenceNotifications(setting: SettingService<ObsidianServiceContext>): boolean {
    return (setting as Partial<ObsidianSettingService<ObsidianServiceContext>>).silenceNotifications === true;
}

export async function setSilenceNotifications(
    setting: SettingService<ObsidianServiceContext>,
    enabled: boolean
): Promise<void> {
    await (setting as ObsidianSettingService<ObsidianServiceContext>).setSilenceNotifications(enabled);
}

/**
 * A negative storage-size threshold means 'not configured', which makes the
 * synchronisation engine ask about it. Red Sync treats an unset threshold as
 * unlimited (0) and keeps a configured value when the engine tries to reset it.
 */
function normaliseSizeThreshold(requested: number | undefined, current: number | undefined): number | undefined {
    if (requested === undefined || requested >= 0) return requested;
    return current !== undefined && current >= 0 ? current : 0;
}

export function normaliseObsidianSettingsData(data: unknown): ObsidianLiveSyncSettings | undefined {
    if (typeof data !== "object" || data === null || Array.isArray(data)) return undefined;
    return data as ObsidianLiveSyncSettings;
}

export class ObsidianSettingService<T extends ObsidianServiceContext> extends SettingService<T> {
    private _statsForNerds = false;

    get statsForNerds(): boolean {
        return this._statsForNerds;
    }

    async setStatsForNerds(enabled: boolean): Promise<void> {
        if (this._statsForNerds === enabled) return;
        await this.config.setObject(STATS_FOR_NERDS_KEY, enabled);
        this._statsForNerds = enabled;
        this.context.events.emitEvent(EVENT_STATS_FOR_NERDS_CHANGED);
    }

    get silenceNotifications(): boolean {
        return this.context.notificationsSilenced;
    }

    async setSilenceNotifications(enabled: boolean): Promise<void> {
        if (this.context.notificationsSilenced === enabled) return;
        await this.config.setObject(SILENCE_NOTIFICATIONS_KEY, enabled);
        this.context.notificationsSilenced = enabled;
        if (enabled) this.context.notices.hideAll();
    }

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
        adjusted.notifyThresholdOfRemoteStorageSize = normaliseSizeThreshold(
            adjusted.notifyThresholdOfRemoteStorageSize,
            undefined
        )!;
        return adjusted;
    }

    override applyPartial(partial: Partial<ObsidianLiveSyncSettings>, saveImmediately?: boolean): Promise<void> {
        if (partial.notifyThresholdOfRemoteStorageSize !== undefined) {
            partial = {
                ...partial,
                notifyThresholdOfRemoteStorageSize: normaliseSizeThreshold(
                    partial.notifyThresholdOfRemoteStorageSize,
                    this.settings?.notifyThresholdOfRemoteStorageSize
                ),
            };
        }
        return super.applyPartial(partial, saveImmediately);
    }

    override async loadSettings(): Promise<void> {
        await super.loadSettings();
        this._statsForNerds = (await this.config.getObject(STATS_FOR_NERDS_KEY)) === true;
        this.context.notificationsSilenced = (await this.config.getObject(SILENCE_NOTIFICATIONS_KEY)) === true;
        this.context.events.emitEvent(EVENT_STATS_FOR_NERDS_CHANGED);
    }

    protected override async saveData(data: ObsidianLiveSyncSettings): Promise<void> {
        return await this.context.liveSyncPlugin.saveData(data);
    }

    protected override async loadData(): Promise<ObsidianLiveSyncSettings | undefined> {
        return normaliseObsidianSettingsData(await this.context.liveSyncPlugin.loadData());
    }
}
