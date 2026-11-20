import { type FilePath } from "@vrtmrz/livesync-commonlib/compat/common/types";

export {
    addIcon,
    App,
    debounce,
    MarkdownRenderer,
    Modal,
    Notice,
    Platform,
    Plugin,
    PluginSettingTab,
    requestUrl,
    Setting,
    stringifyYaml,
    TAbstractFile,
    TFile,
    TFolder,
    ItemView,
    WorkspaceLeaf,
    getLanguage,
    ButtonComponent,
    Component,
} from "obsidian";
export type { PluginManifest, RequestUrlParam, Command, ViewCreator } from "obsidian";
import { normalizePath as normalizePath_ } from "obsidian";
const normalizePath = normalizePath_ as <T extends string | FilePath>(from: T) => T;
export { normalizePath };
