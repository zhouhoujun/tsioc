import type { AgentConsoleVimController } from './AgentConsoleVimController';
import type { AgentConsoleFocusLayers } from './AgentConsoleFocusLayers';
import type { AgentConsoleSelectOption } from './AgentConsoleStateTypes';
import type { ConsoleInputMode } from './AgentConsoleVim';
import { VIM_DEFAULT_BINDINGS } from './AgentConsoleVim';
import { AgentConsoleSessionTimelineHost } from './AgentConsoleSessionTimelineHost';

/** Vim input mode, focus sync and select interaction facade. */
export abstract class AgentConsoleSessionInputHost extends AgentConsoleSessionTimelineHost {
    abstract readonly vimController: AgentConsoleVimController;
    abstract readonly focusLayers: AgentConsoleFocusLayers;
    abstract cancelSelectMenu(): Promise<void>;
    abstract selectAsync(title: string, options: AgentConsoleSelectOption[], selectedIndex?: number, hint?: string, kind?: string): Promise<string | undefined>;

    get effectiveVimBindings(): Record<string, string> {
        return { ...VIM_DEFAULT_BINDINGS, ...this.vimBindings };
    }

    setVimMode(enabled: boolean): void {
        this.vimMode = !!enabled;
        if (!this.vimMode) {
            this.inputMode = 'insert';
            this.vimPendingKey = '';
        }
    }

    setInputMode(mode: ConsoleInputMode): void {
        if (!this.vimMode) {
            this.inputMode = 'insert';
            return;
        }
        this.inputMode = mode;
        if (mode === 'insert') {
            this.vimPendingKey = '';
        }
    }

    setVimBinding(key: string, action: string): boolean {
        return this.vimController.setBinding(key, action);
    }

    unsetVimBinding(key: string): boolean {
        return this.vimController.unsetBinding(key);
    }

    resetVimBindings(): void {
        this.vimController.resetBindings();
    }

    handleVimKey(key: string): boolean {
        return this.vimController.handleKey(key);
    }

    applyVimAction(action: string): boolean {
        return this.vimController.applyAction(action);
    }

    syncDerivedInputFocus(): void {
        this.focusLayers.sync();
    }

    beginSelectInteraction(): () => void {
        const previousInputLocked = this.inputLocked;
        this.inputLocked = true;
        this.modalPromptActive = true;
        let finished = false;
        return () => {
            if (finished) {
                return;
            }
            finished = true;
            this.modalPromptActive = false;
            this.inputLocked = previousInputLocked;
            void this.cancelSelectMenu();
        };
    }

    async promptSelect(title: string, options: AgentConsoleSelectOption[], initialIndex = 0, hint?: string): Promise<string | undefined> {
        const finishSelectInteraction = this.beginSelectInteraction();
        try {
            return await this.selectAsync(title, options, initialIndex, hint);
        } finally {
            finishSelectInteraction();
        }
    }
}
