import { App, Modal } from "@/deps.ts";
import { CANCELLED, LEAVE_TO_SUBSEQUENT, type diff_result, type FilePathWithPrefix } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { EVENT_CONFLICT_CANCELLED, EVENT_PLUGIN_UNLOADED, eventHub } from "@/common/events.ts";
import { promiseWithResolvers } from "octagonal-wheels/promises";
import {
    KEEP_COPY,
    POSTPONED,
    splitByAge,
    type MergeDialogResult,
} from "@/serviceFeatures/interactiveConflictResolution/types";

export { POSTPONED, type MergeDialogResult };

function displayName(path: string): string {
    return path.split("/").pop() ?? path;
}

/**
 * Asks how to resolve a note which was changed on two devices and could not be
 * merged automatically: merge both, keep both, or keep the newer version.
 */
export class ConflictResolveModal extends Modal {
    readonly result: diff_result;
    readonly filename: FilePathWithPrefix;

    response: MergeDialogResult = CANCELLED;
    consumed = false;
    private readonly resultPromise = promiseWithResolvers<MergeDialogResult>();
    private eventSubscriptions?: AbortController;

    constructor(app: App, filename: FilePathWithPrefix, diff: diff_result) {
        super(app);
        this.result = diff;
        this.filename = filename;
    }

    override onOpen() {
        this.eventSubscriptions?.abort();
        const eventSubscriptions = new AbortController();
        this.eventSubscriptions = eventSubscriptions;
        eventHub.onceEvent(EVENT_PLUGIN_UNLOADED, () => this.sendResponse(CANCELLED), {
            signal: eventSubscriptions.signal,
        });
        // Cancel an older dialogue for this path before subscribing this
        // instance; emitting after subscription would close this one too.
        eventHub.emitEvent(EVENT_CONFLICT_CANCELLED, this.filename);
        eventHub.onEvent(
            EVENT_CONFLICT_CANCELLED,
            (path) => {
                if (path === this.filename) this.sendResponse(CANCELLED);
            },
            { signal: eventSubscriptions.signal }
        );

        const { newer, older } = splitByAge(this.result);
        const newerTime = new Date(newer.mtime).toLocaleString();
        this.modalEl.addClass("dialog-host");
        this.titleEl.setText("Changed on two devices");
        const { contentEl } = this;
        contentEl.empty();
        const body = contentEl.createDiv({ cls: "rs-setup" });
        body.createEl("p", {
            cls: "rs-setup-lead",
            text: `"${displayName(this.filename)}" was edited on this device and on another device before they synced. What should be kept?`,
        });
        const choices = body.createDiv({ cls: "rs-choices" });
        const addChoice = (title: string, description: string, result: MergeDialogResult) => {
            choices.createEl("button", { cls: "rs-choice" }, (button) => {
                button.createSpan({ cls: "rs-choice-title", text: title });
                button.createSpan({ cls: "rs-choice-description", text: description });
                button.addEventListener("click", () => this.sendResponse(result));
            });
        };
        addChoice(
            "Merge both",
            "Keep the text from both versions in the note. You may need to tidy up any repeated lines.",
            LEAVE_TO_SUBSEQUENT
        );
        addChoice(
            "Keep both",
            "Keep the newer version in the note and save the other one as a conflicted copy next to it.",
            KEEP_COPY
        );
        addChoice("Keep newer", `Keep the version from ${newerTime} and discard the other one.`, older.rev);
        const actions = body.createDiv({ cls: "rs-actions" });
        actions.createEl("button", { text: "Decide later" }, (button) => {
            button.addEventListener("click", () => this.sendResponse(POSTPONED));
        });
    }

    sendResponse(result: MergeDialogResult) {
        this.response = result;
        this.close();
    }

    override onClose() {
        this.contentEl.empty();
        this.eventSubscriptions?.abort();
        this.eventSubscriptions = undefined;
        if (this.consumed) return;
        this.consumed = true;
        this.resultPromise.resolve(this.response);
    }

    async waitForResult(): Promise<MergeDialogResult> {
        return await this.resultPromise.promise;
    }
}
