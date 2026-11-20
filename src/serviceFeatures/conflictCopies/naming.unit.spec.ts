import { describe, expect, it } from "vitest";
import { conflictedCopyPath, splitByAge } from "./naming";

describe("conflict helpers", () => {
    it("names a conflicted copy like Obsidian Sync", () => {
        const mtime = new Date(2026, 10, 21, 9, 5).getTime();
        expect(conflictedCopyPath("Notes/Meeting notes.md", mtime)).toBe(
            "Notes/Meeting notes (Conflicted copy 202611210905).md"
        );
        expect(conflictedCopyPath("Notes/Meeting notes.md", mtime, 1)).toBe(
            "Notes/Meeting notes (Conflicted copy 202611210905 2).md"
        );
        expect(conflictedCopyPath("folder.v2/README", mtime)).toBe("folder.v2/README (Conflicted copy 202611210905)");
    });

    it("treats the current version as newer when both have the same time", () => {
        const left = { rev: "l", data: "", ctime: 0, mtime: 5 };
        const right = { rev: "r", data: "", ctime: 0, mtime: 5 };
        expect(splitByAge({ left, right, diff: [] }).newer).toBe(left);
        expect(splitByAge({ left, right: { ...right, mtime: 9 }, diff: [] }).older).toBe(left);
    });
});
