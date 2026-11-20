import { describe, expect, it, vi } from "vitest";
import { applySettingsWithScheduledInitialisation, type SetupInitialisationScheduler } from "./setupActivationLifecycle";

function createScheduler() {
    const events: string[] = [];
    const scheduler: SetupInitialisationScheduler = {
        scheduleFetch: vi.fn(async (prepare) => {
            events.push("fetch-reserved");
            await prepare?.();
            return true;
        }),
        scheduleRebuild: vi.fn(async (prepare) => {
            events.push("rebuild-reserved");
            await prepare?.();
            return true;
        }),
    };
    const applySettings = vi.fn(async () => {
        events.push("settings-applied");
    });
    return { applySettings, events, scheduler };
}

describe("setup activation lifecycle", () => {
    it("reserves Fetch or Rebuild before applying settings", async () => {
        const { scheduler, events } = createScheduler();
        await applySettingsWithScheduledInitialisation(scheduler, "fetch", async () => {
            events.push("settings-applied");
        });
        await applySettingsWithScheduledInitialisation(scheduler, "rebuild", async () => {
            events.push("settings-applied");
        });
        expect(events).toEqual(["fetch-reserved", "settings-applied", "rebuild-reserved", "settings-applied"]);
    });

    it("does not apply settings when the scheduler cannot reserve its flag", async () => {
        const { applySettings, scheduler } = createScheduler();
        vi.mocked(scheduler.scheduleFetch).mockResolvedValueOnce(false);

        await expect(applySettingsWithScheduledInitialisation(scheduler, "fetch", applySettings)).resolves.toBe(false);

        expect(applySettings).not.toHaveBeenCalled();
    });
});
