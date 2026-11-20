import {
    CANCELLED,
    LEAVE_TO_SUBSEQUENT,
    type diff_result,
    type FilePathWithPrefix,
} from "@vrtmrz/livesync-commonlib/compat/common/types";

/** The user chose to decide later. */
export const POSTPONED = Symbol("postponed");

/** Keep the newer version in the note and save the other version as a separate copy. */
export const KEEP_COPY = Symbol("keep-copy");

/**
 * The answer to a conflict: cancelled, postponed, merge both (LEAVE_TO_SUBSEQUENT),
 * keep a copy, or the revision to discard (keep newer).
 */
export type MergeDialogResult =
    | typeof CANCELLED
    | typeof POSTPONED
    | typeof LEAVE_TO_SUBSEQUENT
    | typeof KEEP_COPY
    | string;

export interface ConflictResolveDialogue {
    open(): void;
    waitForResult(): Promise<MergeDialogResult>;
}

export type ConflictResolveDialogueFactory = (
    filename: FilePathWithPrefix,
    conflictCheckResult: diff_result
) => ConflictResolveDialogue;

/** The newer and older versions of a conflict. On equal times, the current version counts as newer. */
export function splitByAge(conflict: diff_result) {
    const leftIsNewer = conflict.left.mtime >= conflict.right.mtime;
    return leftIsNewer
        ? { newer: conflict.left, older: conflict.right }
        : { newer: conflict.right, older: conflict.left };
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

/** The path of a conflicted copy, in the style of Obsidian Sync: "Note (Conflicted copy 202611211430).md". */
export function conflictedCopyPath(path: string, mtime: number, attempt = 0): string {
    const date = new Date(mtime);
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
    const slash = path.lastIndexOf("/");
    const dot = path.lastIndexOf(".");
    const hasExtension = dot > slash + 1;
    const stem = hasExtension ? path.slice(0, dot) : path;
    const extension = hasExtension ? path.slice(dot) : "";
    const suffix = attempt > 0 ? ` ${attempt + 1}` : "";
    return `${stem} (Conflicted copy ${stamp}${suffix})${extension}`;
}
