import { Platform, TAbstractFile } from "@/deps.ts";
import {
    isValidFilenameInLinux,
    isValidFilenameInDarwin,
    isValidFilenameInWidows,
    isValidFilenameInAndroid,
    stripAllPrefixes,
} from "@vrtmrz/livesync-commonlib/compat/string_and_binary/path";

import { Logger } from "@vrtmrz/livesync-commonlib/compat/common/logger";
import {
    LOG_LEVEL_VERBOSE,
    type AnyEntry,
    type FilePath,
    type UXFileInfo,
    type UXFileInfoStub,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { sameChangePairs } from "./stores.ts";

export { scheduleTask } from "octagonal-wheels/concurrency/task";

export function getPathFromTFile(file: TAbstractFile) {
    return file.path as FilePath;
}

export function isValidPath(filename: string) {
    if (Platform.isDesktop) {
        // if(Platform.isMacOS) return isValidFilenameInDarwin(filename);
        if (process.platform == "darwin") return isValidFilenameInDarwin(filename);
        if (process.platform == "linux") return isValidFilenameInLinux(filename);
        return isValidFilenameInWidows(filename);
    }
    if (Platform.isAndroidApp) return isValidFilenameInAndroid(filename);
    if (Platform.isIosApp) return isValidFilenameInDarwin(filename);
    //Fallback
    Logger("Could not determine platform for checking filename", LOG_LEVEL_VERBOSE);
    return isValidFilenameInWidows(filename);
}

import { BASE_IS_NEW, EVEN, TARGET_IS_NEW } from "@vrtmrz/livesync-commonlib/compat/common/models/shared.const.symbols";
export { BASE_IS_NEW, EVEN, TARGET_IS_NEW };
// Why 2000? : ZIP FILE Does not have enough resolution.
import { compareMTime } from "@vrtmrz/livesync-commonlib/compat/common/utils";
export { compareMTime };
function getKey(file: AnyEntry | string | UXFileInfoStub) {
    const key = typeof file == "string" ? file : stripAllPrefixes(file.path);
    return key;
}

export function markChangesAreSame(file: AnyEntry | string | UXFileInfoStub, mtime1: number, mtime2: number) {
    if (mtime1 === mtime2) return true;
    const key = getKey(file);
    const pairs = sameChangePairs.get(key, []) || [];
    if (pairs.some((e) => e == mtime1 || e == mtime2)) {
        sameChangePairs.set(key, [...new Set([...pairs, mtime1, mtime2])]);
    } else {
        sameChangePairs.set(key, [mtime1, mtime2]);
    }
}

export function unmarkChanges(file: AnyEntry | string | UXFileInfoStub) {
    const key = getKey(file);
    sameChangePairs.delete(key);
}
export function isMarkedAsSameChanges(
    file: UXFileInfoStub | AnyEntry | string,
    mtimes: number[]
): undefined | typeof EVEN {
    const key = getKey(file);
    const pairs = sameChangePairs.get(key, []) || [];
    if (mtimes.every((e) => pairs.indexOf(e) !== -1)) {
        return EVEN;
    }
}
export function compareFileFreshness(
    baseFile: UXFileInfoStub | AnyEntry | undefined,
    checkTarget: UXFileInfo | AnyEntry | undefined
): typeof BASE_IS_NEW | typeof TARGET_IS_NEW | typeof EVEN {
    if (baseFile === undefined && checkTarget == undefined) return EVEN;
    if (baseFile == undefined) return TARGET_IS_NEW;
    if (checkTarget == undefined) return BASE_IS_NEW;

    const modifiedBase = "stat" in baseFile ? (baseFile?.stat?.mtime ?? 0) : (baseFile?.mtime ?? 0);
    const modifiedTarget = "stat" in checkTarget ? (checkTarget?.stat?.mtime ?? 0) : (checkTarget?.mtime ?? 0);

    if (modifiedBase && modifiedTarget && isMarkedAsSameChanges(baseFile, [modifiedBase, modifiedTarget])) {
        return EVEN;
    }
    return compareMTime(modifiedBase, modifiedTarget);
}
