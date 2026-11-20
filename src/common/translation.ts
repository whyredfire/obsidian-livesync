import {
    commonlibEnglishMessages,
    englishMessageTranslator,
    type CommonlibMessageKey,
    type MessageTranslator,
} from "@vrtmrz/livesync-commonlib/context";
import type { TaggedType } from "octagonal-wheels/common/types";
import { englishMessages, type MessageKey } from "./messages/en.ts";

/** Keys accepted by the composed Red Sync and Commonlib message boundary. */
export type AllMessageKeys = MessageKey | CommonlibMessageKey;

function isLiveSyncMessageKey(key: string): key is MessageKey {
    return Object.prototype.hasOwnProperty.call(englishMessages, key);
}

function isCommonlibMessageKey(key: string): key is CommonlibMessageKey {
    return Object.prototype.hasOwnProperty.call(commonlibEnglishMessages, key);
}

/** Resolve a message key to its English text, or return the input unchanged when it is not a key. */
export function $t(message: string): string {
    if (message.trim() === "") return message;
    if (isLiveSyncMessageKey(message)) return englishMessages[message];
    if (isCommonlibMessageKey(message)) return englishMessageTranslator(message);
    return message;
}

/** Resolve a message key when one exists; plain text is returned as it is. */
export function translateIfAvailable(message: string): string {
    return $t(message);
}

/** Resolve a message key and substitute `${name}` placeholders. */
export function $msg<T extends AllMessageKeys>(key: T, params: Record<string, string> = {}): TaggedType<string, T> {
    let msg = $t(key);
    for (const [placeholder, value] of Object.entries(params)) {
        msg = msg.split(`\${${placeholder}}`).join(value);
    }
    return msg as TaggedType<string, T>;
}

/** Supplies the Red Sync message catalogue through the Commonlib host boundary. */
export type LiveSyncMessageTranslator = MessageTranslator<AllMessageKeys>;

export const translateLiveSyncMessage: LiveSyncMessageTranslator = (key, params) => {
    if (!isLiveSyncMessageKey(key)) return englishMessageTranslator(key, params);
    return $msg(key, params === undefined ? undefined : { ...params });
};
