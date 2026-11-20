import { describe, expect, it, vi } from "vitest";
import { POSTPONED, ConflictResolveModal } from "./ConflictResolveModal.ts";
import {
    CANCELLED,
    LEAVE_TO_SUBSEQUENT,
    type diff_result,
    type FilePathWithPrefix,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { EVENT_CONFLICT_CANCELLED, EVENT_PLUGIN_UNLOADED, eventHub } from "@/common/events.ts";
import { KEEP_COPY } from "@/serviceFeatures/interactiveConflictResolution/types";

type FakeButton = { title: string; click: () => void };

vi.mock("@/deps.ts", () => ({
    App: class App {},
    Modal: class Modal {
        buttons: FakeButton[] = [];

        private createElement(): Record<string, unknown> {
            const element: Record<string, unknown> = {
                addClass: vi.fn(),
                empty: vi.fn(),
                setText: vi.fn(),
            };
            const spans: string[] = [];
            element.createDiv = vi.fn(() => this.createElement());
            element.createSpan = vi.fn((options?: { text?: string }) => {
                if (options?.text) spans.push(options.text);
                return this.createElement();
            });
            element.createEl = vi.fn(
                (tag: string, options?: { text?: string }, callback?: (child: Record<string, unknown>) => void) => {
                    const child = this.createElement();
                    if (tag === "button") {
                        const button: FakeButton = { title: options?.text ?? "", click: () => undefined };
                        child.addEventListener = vi.fn((_name: string, listener: () => void) => {
                            button.click = listener;
                        });
                        const childSpans: string[] = [];
                        child.createSpan = vi.fn((spanOptions?: { text?: string }) => {
                            if (spanOptions?.text) childSpans.push(spanOptions.text);
                            return this.createElement();
                        });
                        callback?.(child);
                        if (!button.title) button.title = childSpans[0] ?? "";
                        this.buttons.push(button);
                        return child;
                    }
                    callback?.(child);
                    return child;
                }
            );
            return element;
        }

        contentEl = this.createElement();
        modalEl = this.createElement();
        titleEl = this.createElement();

        close() {
            (this as { onClose?: () => void }).onClose?.();
        }
    },
}));

const conflict: diff_result = {
    left: { rev: "2-left", data: "left", ctime: 1, mtime: 20 },
    right: { rev: "2-right", data: "right", ctime: 1, mtime: 10 },
    diff: [],
};

type ModalWithButtons = ConflictResolveModal & { buttons: FakeButton[] };

function openModal(filename = "note.md", diff = conflict): ModalWithButtons {
    const modal = new ConflictResolveModal({} as never, filename as FilePathWithPrefix, diff) as ModalWithButtons;
    modal.onOpen();
    return modal;
}

function press(modal: ModalWithButtons, title: string) {
    const button = modal.buttons.find((candidate) => candidate.title === title);
    if (!button) throw new Error(`No button "${title}" in ${modal.buttons.map((b) => b.title).join(", ")}`);
    button.click();
}

describe("ConflictResolveModal choices", () => {
    it("offers exactly three choices and a way to decide later", () => {
        const modal = openModal();
        expect(modal.buttons.map((button) => button.title)).toEqual([
            "Merge both",
            "Keep both",
            "Keep newer",
            "Decide later",
        ]);
        modal.close();
    });

    it.each([
        ["Merge both", LEAVE_TO_SUBSEQUENT],
        ["Keep both", KEEP_COPY],
        ["Decide later", POSTPONED],
    ] as const)("answers %s", async (title, expected) => {
        const modal = openModal();
        press(modal, title);
        await expect(modal.waitForResult()).resolves.toBe(expected);
    });

    it("keeps the newer version by discarding the older revision", async () => {
        const modal = openModal();
        press(modal, "Keep newer");
        await expect(modal.waitForResult()).resolves.toBe("2-right");

        const reversed = openModal("other.md", {
            ...conflict,
            left: { ...conflict.left, mtime: 5 },
        });
        press(reversed, "Keep newer");
        await expect(reversed.waitForResult()).resolves.toBe("2-left");
    });
});

describe("ConflictResolveModal result lifecycle", () => {
    it("returns a response which closes the dialogue before the caller begins waiting", async () => {
        const modal = new ConflictResolveModal({} as never, "early-response.md" as FilePathWithPrefix, conflict);

        modal.sendResponse(POSTPONED);
        await expect(modal.waitForResult()).resolves.toBe(POSTPONED);
    });

    it("cancels the previous same-path dialogue without cancelling the replacement", async () => {
        const filename = "same-path.md" as FilePathWithPrefix;
        const previous = new ConflictResolveModal({} as never, filename, conflict);
        const replacement = new ConflictResolveModal({} as never, filename, conflict);
        previous.onOpen();

        replacement.onOpen();
        const previousResult = await Promise.race([
            previous.waitForResult(),
            new Promise<"timed-out">((resolve) => setTimeout(() => resolve("timed-out"), 250)),
        ]);
        const replacementState = await Promise.race([
            replacement.waitForResult(),
            new Promise<"still-open">((resolve) => setTimeout(() => resolve("still-open"), 25)),
        ]);

        replacement.sendResponse(CANCELLED);

        expect(previousResult).toBe(CANCELLED);
        expect(replacementState).toBe("still-open");
    });

    it("closes for an external resolution of the same file and ignores other files", async () => {
        const filename = "resolved-elsewhere.md" as FilePathWithPrefix;
        const modal = new ConflictResolveModal({} as never, filename, conflict);
        modal.onOpen();

        eventHub.emitEvent(EVENT_CONFLICT_CANCELLED, "other.md" as FilePathWithPrefix);
        const stateAfterOtherFile = await Promise.race([
            modal.waitForResult(),
            new Promise<"still-open">((resolve) => setTimeout(() => resolve("still-open"), 25)),
        ]);
        eventHub.emitEvent(EVENT_CONFLICT_CANCELLED, filename);

        await expect(modal.waitForResult()).resolves.toBe(CANCELLED);
        expect(stateAfterOtherFile).toBe("still-open");
    });

    it("closes and completes its result when the plug-in unloads", async () => {
        const modal = new ConflictResolveModal({} as never, "open-during-unload.md" as FilePathWithPrefix, conflict);
        modal.onOpen();

        eventHub.emitEvent(EVENT_PLUGIN_UNLOADED);
        await expect(modal.waitForResult()).resolves.toBe(CANCELLED);
    });
});
