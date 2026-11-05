import type {
    AgentConsoleHealthItem,
    AgentConsoleOptions
} from './AgentConsoleStateTypes';
import { defaultAgentConsoleOptions } from './AgentConsoleStateTypes';
import { AgentConsoleThemeInput, mergeAgentConsoleTheme, resolveAgentConsoleThemeStyles } from './AgentConsoleTheme';
import { normalizeMessageLayout } from './AgentConsoleViewport';
import { AgentConsoleSessionCodingTaskHost } from './AgentConsoleSessionCodingTaskHost';

/** Theme, console options, layout, which-key and health display facade. */
export abstract class AgentConsoleSessionOptionsHost extends AgentConsoleSessionCodingTaskHost {
    protected abstract localeOptionOverrides: Partial<Required<AgentConsoleOptions>>;
    protected abstract hostProvidedOptions: Set<string>;

    setTimelineMode(value: boolean | 'off' | 'compact' | 'steps' | 'verbose'): void {
        if (typeof value === 'boolean') {
            this.timelineViewMode = value ? 'compact' : 'off';
        } else {
            this.timelineViewMode = value;
        }
    }

    get messageLayout(): 'scrollback' | 'viewport' {
        return normalizeMessageLayout(this.consoleOptions.messageLayout);
    }

    setMessageLayout(value: 'scrollback' | 'viewport' | 'stream'): void {
        this.consoleOptions = {
            ...this.consoleOptions,
            messageLayout: normalizeMessageLayout(value)
        };
    }

    setWhichKeyVisible(value: boolean): void {
        this.whichKeyVisible = !!value;
        if (!this.whichKeyVisible) {
            this.whichKeyBindings = [];
        }
    }

    setWhichKeyBindings(bindings: Array<{ key: string; action: string }>): void {
        this.whichKeyBindings = bindings.slice();
    }

    toggleWhichKeyLayout(): void {
        this.whichKeyLayout = this.whichKeyLayout === 'compact' ? 'grouped' : 'compact';
        this.whichKeyPage = 0;
    }

    toggleWhichKeyFilterCustom(): void {
        this.whichKeyFilterCustom = !this.whichKeyFilterCustom;
        this.whichKeyPage = 0;
    }

    setWhichKeyPage(page: number): void {
        this.whichKeyPage = Math.max(0, page);
    }

    setHealthPopoverVisible(value: boolean): void {
        this.healthPopoverVisible = !!value;
        if (!this.healthPopoverVisible) {
            this.healthItems = [];
        }
    }

    setHealthItems(items: AgentConsoleHealthItem[]): void {
        this.healthItems = items.slice();
    }

    setRawMode(value: boolean): void {
        this.rawMode = !!value;
    }

    setTheme(theme?: AgentConsoleThemeInput | null): void {
        this.theme = mergeAgentConsoleTheme(theme);
        this.themeStyles = resolveAgentConsoleThemeStyles(this.theme);
    }

    setConsoleOptions(options?: AgentConsoleOptions | null): void {
        this.hostProvidedOptions = new Set(Object.keys(options || {}).filter(key => (options as any)[key] !== undefined && !(key.endsWith('Hint') && (options as any)[key] === (defaultAgentConsoleOptions as any)[key])));
        this.consoleOptions = {
            ...defaultAgentConsoleOptions,
            ...(options || {})
        };
        for (const key of Object.keys(this.localeOptionOverrides) as Array<keyof AgentConsoleOptions>) {
            if (!options || (options as any)[key] === undefined || (key.endsWith('Hint') && (options as any)[key] === (defaultAgentConsoleOptions as any)[key])) {
                (this.consoleOptions as any)[key] = (this.localeOptionOverrides as any)[key];
            }
        }
        this.inputPrompt = this.consoleOptions.inputPrompt;
        this.inputContinuationPrompt = this.consoleOptions.inputContinuationPrompt;
        this.inputPlaceholder = this.consoleOptions.inputPlaceholder;
        this.vimMode = this.consoleOptions.vimMode;
        this.messageDetailVisibleLines = this.consoleOptions.messageDetailVisibleLines;
        if (!this.vimMode) {
            this.inputMode = 'insert';
            this.vimPendingKey = '';
        }
    }

    setMessageDetailVisibleLines(value: number): void {
        this.messageDetailVisibleLines = Math.max(1, Math.floor(Number(value) || defaultAgentConsoleOptions.messageDetailVisibleLines));
        const maxScroll = Math.max(0, this.messageDetailLines.length - this.messageDetailVisibleLines);
        this.messageDetailScroll = Math.min(this.messageDetailScroll, maxScroll);
    }
}
