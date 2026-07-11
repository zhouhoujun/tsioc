import { AgentConsoleUiDelegate, ModelProfile } from '@tsdi/agent';

export type ShowSelectMenuFn = (
    title: string,
    options: Array<{ label: string; value: string; description?: string; detail?: any }>,
    selectedIndex?: number,
    hint?: string
) => Promise<string | undefined>;

export type PromptLineFn = (
    question: string,
    options?: { secret?: boolean }
) => Promise<string>;

export type NotifyFn = (message: string, duration?: number) => void;

export type CopyTextFn = (text: string) => Promise<boolean>;

export type QuitFn = () => void;

export interface ModelProfileAdapter {
    apply(profile: ModelProfile): Promise<void>;
}

export class TerminalConsoleUiDelegate extends AgentConsoleUiDelegate {
    private modelAdapter?: ModelProfileAdapter;
    private quitFn?: QuitFn;

    constructor(
        private showSelectMenu: ShowSelectMenuFn,
        private promptLine: PromptLineFn,
        private notifyFn: NotifyFn,
        private copyTextFn: CopyTextFn,
    ) {
        super();
    }

    setModelProfileAdapter(adapter: ModelProfileAdapter): void {
        this.modelAdapter = adapter;
    }

    setQuitFn(fn: QuitFn): void {
        this.quitFn = fn;
    }

    async select(
        title: string,
        options: Array<{ label: string; value: string; description?: string; detail?: any }>,
        selectedIndex = 0,
        hint?: string
    ): Promise<string | undefined> {
        return this.showSelectMenu(title, options, selectedIndex, hint);
    }

    async prompt(
        question: string,
        secret?: boolean
    ): Promise<string | undefined> {
        return this.promptLine(question, { secret });
    }

    notify(message: string, duration?: number): void {
        this.notifyFn(message, duration);
    }

    async copyText(text: string): Promise<boolean> {
        return this.copyTextFn(text);
    }

    async applyModelProfile(profile: ModelProfile): Promise<void> {
        if (this.modelAdapter) {
            await this.modelAdapter.apply(profile);
        }
    }

    quit(): void {
        this.quitFn?.();
    }
}
