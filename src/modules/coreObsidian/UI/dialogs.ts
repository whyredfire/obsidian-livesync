import { ButtonComponent } from "@/deps.ts";
import { App, MarkdownRenderer, Modal, Plugin, Setting, Component } from "@/deps.ts";
import { EVENT_PLUGIN_UNLOADED, eventHub } from "@/common/events.ts";
import { compatGlobal, type CompatIntervalHandle } from "@vrtmrz/livesync-commonlib/compat/common/coreEnvFunctions";
import { $msg } from "@/common/translation";

class AutoClosableModal extends Modal {
    _closeByUnload = () => {
        eventHub.off(EVENT_PLUGIN_UNLOADED, this._closeByUnload);
        this.close();
    };

    constructor(app: App) {
        super(app);
        eventHub.once(EVENT_PLUGIN_UNLOADED, this._closeByUnload);
    }
    override onClose() {
        eventHub.off(EVENT_PLUGIN_UNLOADED, this._closeByUnload);
    }
}

export class MessageBox<T extends readonly string[]> extends AutoClosableModal {
    plugin: Plugin;
    title: string;
    contentMd: string;
    buttons: T;
    result: string | false = false;
    isManuallyClosed = false;
    defaultAction: string | undefined;
    timeout: number | undefined;
    timer: CompatIntervalHandle | undefined = undefined;
    defaultButtonComponent: ButtonComponent | undefined;
    wideButton: boolean;

    onSubmit: (result: string | false) => void;
    component: Component = new Component();

    constructor(
        plugin: Plugin,
        title: string,
        contentMd: string,
        buttons: T,
        defaultAction: T[number],
        timeout: number | undefined,
        wideButton: boolean,
        onSubmit: (result: T[number] | false) => void
    ) {
        super(plugin.app);
        this.plugin = plugin;
        this.title = title;
        this.contentMd = contentMd;
        this.buttons = buttons;
        this.onSubmit = onSubmit;
        this.defaultAction = defaultAction;
        this.timeout = timeout;
        this.wideButton = wideButton;
        if (this.timeout) {
            this.timer = compatGlobal.setInterval(() => {
                if (this.timeout === undefined) return;
                this.timeout--;
                if (this.timeout < 0) {
                    if (this.timer) {
                        compatGlobal.clearInterval(this.timer);
                        this.defaultButtonComponent?.setButtonText(`${defaultAction}`);
                        this.timer = undefined;
                    }
                    this.result = defaultAction;
                    this.isManuallyClosed = true;
                    this.close();
                } else {
                    this.defaultButtonComponent?.setButtonText(`( ${this.timeout} ) ${defaultAction}`);
                }
            }, 1000);
        }
    }

    override onOpen() {
        this.component.load();
        const { contentEl } = this;
        contentEl.closest(".modal-container")?.classList.add("livesync-message-box-container");
        this.titleEl.setText(this.title);
        const div = contentEl.createDiv();
        div.addClass("sls-message-box-markdown");
        void MarkdownRenderer.render(this.plugin.app, this.contentMd, div, "/", this.component);
        const buttonSetting = new Setting(contentEl);
        const labelWrapper = contentEl.createDiv();
        labelWrapper.addClass("sls-dialogue-note-wrapper");
        const labelEl = labelWrapper.createEl("label", {
            text: $msg("To stop the countdown, tap anywhere on the dialogue"),
        });
        labelEl.addClass("sls-dialogue-note-countdown");
        if (!this.timeout || !this.timer) {
            labelWrapper.empty();
            labelWrapper.addClass("sls-hidden");
        }

        buttonSetting.infoEl.addClass("sls-hidden");
        buttonSetting.controlEl.addClass("sls-message-box-button-control");
        if (this.wideButton) {
            buttonSetting.controlEl.addClass("sls-message-box-button-control-wide");
        }
        contentEl.addEventListener("click", () => {
            if (this.timer) {
                labelWrapper.empty();
                labelWrapper.addClass("sls-hidden");
                compatGlobal.clearInterval(this.timer);
                this.timer = undefined;
                this.defaultButtonComponent?.setButtonText(`${this.defaultAction}`);
            }
        });
        for (const button of this.buttons) {
            buttonSetting.addButton((btn) => {
                btn.setButtonText(button).onClick(() => {
                    this.isManuallyClosed = true;
                    this.result = button;
                    if (this.timer) {
                        compatGlobal.clearInterval(this.timer);
                        this.timer = undefined;
                    }
                    this.close();
                });
                if (button == this.defaultAction) {
                    this.defaultButtonComponent = btn;
                    btn.setCta();
                }
                if (this.wideButton) {
                    btn.buttonEl.addClass("sls-message-box-wide-button");
                }
                return btn;
            });
        }
    }

    override onClose() {
        super.onClose();
        this.component.unload();
        const { contentEl } = this;
        contentEl.empty();
        if (this.timer) {
            compatGlobal.clearInterval(this.timer);
            this.timer = undefined;
        }
        if (this.isManuallyClosed) {
            this.onSubmit(this.result);
        } else {
            this.onSubmit(false);
        }
    }
}
export function confirmWithMessageWithWideButton<T extends readonly string[]>(
    plugin: Plugin,
    title: string,
    contentMd: string,
    buttons: T,
    defaultAction: T[number],
    timeout?: number
): Promise<T[number] | false> {
    return new Promise((res) => {
        const dialog = new MessageBox(plugin, title, contentMd, buttons, defaultAction, timeout, true, (result) =>
            res(result)
        );
        dialog.open();
    });
}
