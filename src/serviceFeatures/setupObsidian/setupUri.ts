import { createCommandCheck } from "@vrtmrz/obsidian-plugin-kit/command";
import type { ObsidianLiveSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/types";
import {
    encodeTimeBoundSetupURI,
    getTimeBoundSetupURIUsableUntil,
    isTimeBoundSetupURIUsableNow,
} from "@vrtmrz/livesync-commonlib/setup-uri";
import { EVENT_REQUEST_COPY_SETUP_URI } from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import { fireAndForget } from "@vrtmrz/livesync-commonlib/compat/common/utils";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import type { SetupFeatureHost } from "./types";
import CopySetupURI from "@/modules/features/SetupWizard/dialogs/CopySetupURI.svelte";
import type {
    CopySetupURIInitialData,
    CopySetupURIResultType,
    CreatedSetupURI,
} from "@/modules/features/SetupWizard/dialogs/setupDialogTypes";

function formatWindowEnd(usableUntil: number): string {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(new Date(usableUntil));
}

/** The end of the current time-bound window, or undefined when the device clock cannot be trusted. */
function currentWindowEnd(): number | undefined {
    try {
        return getTimeBoundSetupURIUsableUntil();
    } catch {
        return undefined;
    }
}

/**
 * Create a setup URI for the given settings.
 *
 * A time-bound URI can be opened until the end of the current fixed seven-day UTC
 * window. If that window changes while the URI is being created, it is created again.
 */
export async function createSetupURI(
    settings: ObsidianLiveSyncSettings,
    passphrase: string,
    timeBound: boolean,
    removeProperties: (keyof ObsidianLiveSyncSettings)[] = ["pluginSyncExtendedSetting"]
): Promise<CreatedSetupURI> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const expected = timeBound ? currentWindowEnd() : null;
        if (expected === undefined) throw new Error("This device's clock is not valid, so the link cannot expire.");
        let result;
        try {
            result = await encodeTimeBoundSetupURI(settings, passphrase, {
                mode: timeBound ? "ephemeral" : "persistent",
                removeProperties,
                skipDefaultValue: true,
            });
        } catch (error) {
            if (timeBound && error instanceof Error && error.message === "Setup URI window changed during generation") {
                continue;
            }
            throw error;
        }
        if (result.usableUntil !== expected || !isTimeBoundSetupURIUsableNow(result.usableUntil)) continue;
        return { uri: result.uri, expires: result.usableUntil === null ? null : formatWindowEnd(result.usableUntil) };
    }
    throw new Error("The link could not be created. Try again.");
}

/** Open the dialogue which creates and copies a setup URI for another device. */
export async function copySetupURI(host: SetupFeatureHost) {
    const windowEnd = currentWindowEnd();
    await host.services.UI.dialogManager.openWithExplicitCancel<CopySetupURIResultType, CopySetupURIInitialData>(
        CopySetupURI,
        {
            expires: windowEnd === undefined ? null : formatWindowEnd(windowEnd),
            create: (passphrase, timeBound) =>
                createSetupURI(host.services.setting.currentSettings(), passphrase, timeBound),
        }
    );
}

export function useSetupURIFeature(host: NecessaryServices<"API" | "UI" | "setting" | "appLifecycle", never>) {
    host.services.appLifecycle.onLoaded.addHandler(() => {
        host.services.API.addCommand({
            id: "livesync-copysetupuri",
            name: "Copy settings as a new setup URI",
            checkCallback: createCommandCheck(
                () => host.services.setting.currentSettings().isConfigured,
                () => {
                    fireAndForget(copySetupURI(host));
                }
            ),
        });

        host.services.context.events.onEvent(EVENT_REQUEST_COPY_SETUP_URI, () =>
            fireAndForget(() => copySetupURI(host))
        );
        return Promise.resolve(true);
    });
}
