// Obsidian to LiveSync Utils

import { TFile, type TAbstractFile, type TFolder } from "@/deps.ts";
import type {
    FilePath,
    FilePathWithPrefix,
    UXFileInfoStub,
    UXFolderInfo,
    UXInternalFileInfoStub,
} from "@vrtmrz/livesync-commonlib/compat/common/types";

export function TFileToUXFileInfoStub(file: TFile | TAbstractFile, deleted?: boolean): UXFileInfoStub {
    if (!(file instanceof TFile)) {
        throw new Error("Invalid file type");
    }
    const ret: UXFileInfoStub = {
        name: file.name,
        path: file.path as FilePathWithPrefix,
        isFolder: false,
        stat: {
            size: file.stat.size,
            mtime: file.stat.mtime,
            ctime: file.stat.ctime,
            type: "file",
        },
        deleted: deleted,
    };
    return ret;
}
export function InternalFileToUXFileInfoStub(filename: FilePathWithPrefix, deleted?: boolean): UXInternalFileInfoStub {
    const name = filename.split("/").pop() as string;
    const ret: UXInternalFileInfoStub = {
        name: name,
        path: filename,
        isFolder: false,
        stat: undefined,
        isInternal: true,
        deleted,
    };
    return ret;
}
export function TFolderToUXFileInfoStub(file: TFolder): UXFolderInfo {
    const ret: UXFolderInfo = {
        name: file.name,
        path: file.path as FilePathWithPrefix,
        parent: file.parent?.path as FilePath | undefined,
        isFolder: true,
        children: file.children.map((e) => TFileToUXFileInfoStub(e)),
    };
    return ret;
}
