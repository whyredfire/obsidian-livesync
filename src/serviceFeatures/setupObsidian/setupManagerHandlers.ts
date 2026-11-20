import type { SetupManager } from "@/modules/features/SetupManager";
import { EVENT_REQUEST_OPEN_SETUP_URI } from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import { fireAndForget } from "@vrtmrz/livesync-commonlib/compat/common/utils";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";

export async function openOnboarding(setupManager: SetupManager) {
    return await setupManager.startOnBoarding();
}

export async function openSetupURI(setupManager: SetupManager) {
    await setupManager.onUseSetupURI();
}

export function useSetupManagerHandlersFeature(
    host: NecessaryServices<"API" | "UI" | "setting" | "appLifecycle", never>,
    setupManager: SetupManager
) {
    host.services.appLifecycle.onLoaded.addHandler(() => {
        host.services.API.addCommand({
            id: "livesync-opensetupuri",
            name: "Use a setup URI",
            callback: () => fireAndForget(openSetupURI(setupManager)),
        });

        host.services.context.events.onEvent(EVENT_REQUEST_OPEN_SETUP_URI, () =>
            fireAndForget(() => openSetupURI(setupManager))
        );

        return Promise.resolve(true);
    });
}
