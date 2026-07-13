import { AgentConsoleSessionChoice, AgentConsoleUiDelegate, ModelProfile } from '@tsdi/agent';

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
export type CopyTargetFn = (target?: string) => Promise<boolean>;
export type ListSessionsFn = () => Promise<AgentConsoleSessionChoice[]>;
export type SwitchSessionFn = (sessionId?: string) => Promise<void>;

export interface ModelProfileAdapter {
    apply(profile: ModelProfile): Promise<void>;
}

export class TerminalConsoleUiDelegate extends AgentConsoleUiDelegate {
    private modelAdapter?: ModelProfileAdapter;
    private quitFn?: QuitFn;
    private copyTargetFn?: CopyTargetFn;
    private listSessionsFn?: ListSessionsFn;
    private switchSessionFn?: SwitchSessionFn;

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

    setCopyTargetFn(fn: CopyTargetFn): void {
        this.copyTargetFn = fn;
    }

    setSessionAdapter(listSessions: ListSessionsFn, switchSession: SwitchSessionFn): void {
        this.listSessionsFn = listSessions;
        this.switchSessionFn = switchSession;
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

    override async copy(target?: string): Promise<boolean> {
        if (!this.copyTargetFn) {
            return false;
        }
        return this.copyTargetFn(target);
    }

    override async listSessions(): Promise<AgentConsoleSessionChoice[]> {
        if (!this.listSessionsFn) {
            return [];
        }
        return this.listSessionsFn();
    }

    override async switchSession(sessionId?: string): Promise<void> {
        if (!this.switchSessionFn) {
            return;
        }
        await this.switchSessionFn(sessionId);
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
