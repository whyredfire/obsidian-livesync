import { LOG_LEVEL_INFO, LOG_LEVEL_NOTICE, LOG_LEVEL_URGENT, LOG_LEVEL_VERBOSE } from "octagonal-wheels/common/logger";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { createInstanceLogFunction, type LogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import {
    FlagFilesHumanReadable,
    FlagFilesOriginal,
} from "@vrtmrz/livesync-commonlib/compat/common/models/redflag.const";
import { RemotePreferredTweakStatuses } from "@vrtmrz/livesync-commonlib/compat/common/models/tweak.definition";
import { assessTweakCompatibility } from "@vrtmrz/livesync-commonlib/settings";
import { UnresolvedErrorManager } from "@vrtmrz/livesync-commonlib/compat/services/base/UnresolvedErrorManager";
import {
    ExtraOnLocal,
    FullScanModes,
    normaliseFullScanOptions,
    synchroniseAllFilesBetweenDBandStorage,
} from "@vrtmrz/livesync-commonlib/compat/serviceFeatures/offlineScanner";
import { clearPendingSetup, readPendingSetup } from "./setupObsidian/pendingSetup";
import { RED_SYNC_SYNC_TRIGGERS } from "@/common/core/settings/newVaultSettings";

/*
 * Fetch ("download everything from R2") and Rebuild ("upload this vault to R2")
 * are scheduled by writing a flag file and restarting. On the next start-up they
 * run here without asking anything: the user already confirmed them, or Red Sync
 * scheduled a Fetch itself because another device replaced the data in R2.
 *
 * - Fetch merges: the newer copy of each file wins and files which exist only on
 *   this device are kept, exactly like "Join an existing sync".
 * - Rebuild uploads this vault with this device's settings.
 * - If R2 cannot be reached, the flag stays and the operation runs again at the
 *   next start-up.
 * - Afterwards automatic synchronisation is switched on.
 */

type InitialisationOperation = "fetch" | "rebuild";

type RedFlagHost = NecessaryServices<
    "API" | "appLifecycle" | "setting" | "tweakValue" | "fileProcessing" | "vault" | "path" | "keyValueDB" | "database",
    "storageAccess" | "rebuilder" | "fileHandler"
>;

const FLAG_FILES: Record<InitialisationOperation, readonly string[]> = {
    fetch: [FlagFilesOriginal.FETCH_ALL, FlagFilesHumanReadable.FETCH_ALL],
    rebuild: [FlagFilesOriginal.REBUILD_ALL, FlagFilesHumanReadable.REBUILD_ALL],
};

async function isFlagged(host: NecessaryServices<never, "storageAccess">, operation: InitialisationOperation) {
    const storage = host.serviceModules.storageAccess;
    for (const name of FLAG_FILES[operation]) {
        if (await storage.isExists(storage.normalisePath(name))) return true;
    }
    return false;
}

/** Remove every alias of the flag; throws if one cannot be removed, so the operation is not repeated silently. */
async function deleteFlags(host: NecessaryServices<never, "storageAccess">, operation: InitialisationOperation) {
    const storage = host.serviceModules.storageAccess;
    for (const name of FLAG_FILES[operation]) {
        const path = storage.normalisePath(name);
        if (await storage.isExists(path)) await storage.delete(path, true);
        if (await storage.isExists(path)) throw new Error(`Could not remove ${name}.`);
    }
}

/**
 * Check that R2 can be reached and, for a Fetch, adopt the synchronisation settings
 * stored there (chunking and similar values every device must share). A Rebuild keeps
 * this device's settings. Returns false when R2 cannot be reached.
 */
async function adoptRemoteSettings(
    host: NecessaryServices<"tweakValue" | "setting", never>,
    log: LogFunction,
    operation: InitialisationOperation
): Promise<boolean> {
    const config = host.services.setting.currentSettings();
    const remote = await host.services.tweakValue.fetchRemotePreferred(config);
    if (remote.status === RemotePreferredTweakStatuses.UNAVAILABLE) {
        log("Could not reach the R2 bucket. Red Sync will try again at the next start-up.", LOG_LEVEL_URGENT);
        log(remote.error, LOG_LEVEL_VERBOSE);
        return false;
    }
    if (operation === "rebuild" || remote.status !== RemotePreferredTweakStatuses.AVAILABLE) return true;
    const assessment = assessTweakCompatibility(config, remote.values);
    if (assessment.alignment !== "matched") {
        await host.services.setting.applyExternalSettings({ ...config, ...assessment.adoptPreferred.changes }, true);
        log("Adopted the synchronisation settings stored in R2.", LOG_LEVEL_INFO);
    }
    return true;
}

type InitialisationSuspensionPolicy = "resume" | "keep-on-failure";

/**
 * Run a Vault initialisation with file watching and synchronisation suspended.
 * @param suspensionPolicy `keep-on-failure` keeps both reflection directions suspended when the
 * process fails, so a partly downloaded database is not synchronised; the flag stays and the
 * operation runs again at the next start-up.
 */
async function processVaultInitialisation(
    host: NecessaryServices<"setting", never>,
    log: LogFunction,
    proc: () => Promise<boolean>,
    suspensionPolicy: InitialisationSuspensionPolicy = "resume"
): Promise<boolean> {
    let completed = false;
    try {
        await host.services.setting.applyPartial({ batchSave: false }, false);
        await host.services.setting.suspendAllSync();
        await host.services.setting.suspendExtraSync();
        await host.services.setting.applyPartial(
            suspensionPolicy === "keep-on-failure"
                ? { suspendFileWatching: true, suspendParseReplicationResult: true }
                : { suspendFileWatching: true },
            true
        );
        completed = await proc();
        return completed;
    } catch (ex) {
        log("Could not finish preparing this device. Red Sync will try again at the next start-up.", LOG_LEVEL_URGENT);
        log(ex, LOG_LEVEL_VERBOSE);
        return false;
    } finally {
        await host.services.setting.applyPartial(
            suspensionPolicy === "resume"
                ? { suspendFileWatching: false }
                : { suspendFileWatching: !completed, suspendParseReplicationResult: !completed },
            true
        );
    }
}

/** Download everything from R2 and merge it with the files in this Vault. */
async function downloadAndMerge(host: RedFlagHost, log: LogFunction): Promise<boolean> {
    return await processVaultInitialisation(
        host,
        log,
        async () => {
            await host.serviceModules.rebuilder.$fetchLocalDBFast(false);
            const errorManager = new UnresolvedErrorManager(host.services.appLifecycle, host.services.context.events);
            const synchronised = await synchroniseAllFilesBetweenDBandStorage(
                host,
                log,
                errorManager,
                normaliseFullScanOptions({
                    mode: FullScanModes.NEWER_WINS,
                    extraOnLocal: ExtraOnLocal.APPEND_STORAGE_ONLY,
                    showingNotice: true,
                    omitEvents: true,
                    ignoreSuspending: true,
                })
            );
            if (!synchronised) {
                log("Some files could not be synchronised; they are listed in the log.", LOG_LEVEL_NOTICE);
            }
            if (!(await host.serviceModules.rebuilder.finishRebuild())) {
                throw new Error("Could not finalise the downloaded database.");
            }
            await deleteFlags(host, "fetch");
            return true;
        },
        "keep-on-failure"
    );
}

/** Upload this Vault to R2, replacing what is there. */
async function uploadEverything(host: RedFlagHost, log: LogFunction): Promise<boolean> {
    return await processVaultInitialisation(host, log, async () => {
        await host.serviceModules.rebuilder.$rebuildEverything();
        await deleteFlags(host, "rebuild");
        return true;
    });
}

/**
 * Switch automatic synchronisation on after a completed Fetch or Rebuild, and say
 * so once when the operation came from the setup form.
 */
async function completeInitialisation(
    host: NecessaryServices<"setting" | "vault", never>,
    log: LogFunction,
    operation: InitialisationOperation
): Promise<void> {
    const fromSetup = await readPendingSetup(host);
    if (fromSetup) await clearPendingSetup(host);
    await host.services.setting.applyPartial(RED_SYNC_SYNC_TRIGGERS, true);
    if (fromSetup) {
        log(
            fromSetup === "new"
                ? "Red Sync is ready: this vault has been uploaded and automatic sync is on."
                : "Red Sync is ready: your notes have been downloaded and automatic sync is on.",
            LOG_LEVEL_URGENT
        );
        return;
    }
    log(
        operation === "fetch"
            ? "Downloaded everything from R2 and merged it with this vault. Automatic sync is on."
            : "Uploaded this vault to R2. Automatic sync is on.",
        LOG_LEVEL_NOTICE
    );
}

/** Run a scheduled Fetch or Rebuild, if one is flagged. Returns false when start-up should not continue. */
export async function runScheduledInitialisation(
    host: RedFlagHost,
    log: LogFunction,
    operation: InitialisationOperation
): Promise<boolean> {
    if (!(await isFlagged(host, operation))) return true;
    log(operation === "fetch" ? "Downloading everything from R2." : "Uploading this vault to R2.", LOG_LEVEL_NOTICE);
    if (!(await adoptRemoteSettings(host, log, operation))) return false;
    const done = operation === "fetch" ? await downloadAndMerge(host, log) : await uploadEverything(host, log);
    if (done) await completeInitialisation(host, log, operation);
    return done;
}

export function useRedFlagFeatures(host: RedFlagHost) {
    const log = createInstanceLogFunction("SF:RedFlag", host.services.API);
    host.services.appLifecycle.onLayoutReady.addHandler(() => runScheduledInitialisation(host, log, "fetch"), 10);
    host.services.appLifecycle.onLayoutReady.addHandler(() => runScheduledInitialisation(host, log, "rebuild"), 20);
}
