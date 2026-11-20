import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import type { SetupMode } from "./setupForm";

/**
 * A short-lived, device-local note that the next Rebuild or Fetch was started
 * by the setup form. The user has already confirmed the choice there, so the
 * scheduled operation runs without further questions and switches automatic
 * synchronisation on when it completes.
 */
type PendingSetupHost = NecessaryServices<"setting" | "vault", never>;

/** A stale note is ignored, so that a later manual Fetch or Rebuild still asks. */
const PENDING_SETUP_MAX_AGE_MS = 60 * 60 * 1000;

function pendingSetupKey(host: PendingSetupHost): string {
    return `red-sync-pending-setup:${host.services.vault.vaultName()}`;
}

export async function markPendingSetup(host: PendingSetupHost, mode: SetupMode, now = Date.now()): Promise<void> {
    await host.services.setting.deviceValues.setValue(pendingSetupKey(host), JSON.stringify({ mode, at: now }));
}

/** Return the pending setup mode if a recent one was recorded on this device. */
export async function readPendingSetup(host: PendingSetupHost, now = Date.now()): Promise<SetupMode | undefined> {
    const raw = await host.services.setting.deviceValues.getValue(pendingSetupKey(host));
    if (typeof raw !== "string") return undefined;
    try {
        const parsed = JSON.parse(raw) as { mode?: unknown; at?: unknown };
        if ((parsed.mode !== "new" && parsed.mode !== "join") || typeof parsed.at !== "number") return undefined;
        if (now - parsed.at > PENDING_SETUP_MAX_AGE_MS || now < parsed.at) return undefined;
        return parsed.mode;
    } catch {
        return undefined;
    }
}

export async function clearPendingSetup(host: PendingSetupHost): Promise<void> {
    await host.services.setting.deviceValues.delete(pendingSetupKey(host));
}
