import type { AgentConsoleOptions } from './AgentConsoleStateTypes';
import { EN_MESSAGE_STATUS_LABELS, ZH_CONSOLE_HINTS, ZH_MESSAGE_STATUS_LABELS } from './AgentConsoleStateTypes';
import { DEFAULT_TIMELINE_LABELS, EN_TIMELINE_LABELS } from './AgentConsoleTimelineWindow';
import { agentConsoleAllCommandHints } from './AgentConsoleCommandRegistry';
import { AgentConsoleInputHistoryController, DefaultAgentConsoleInputHistoryController } from './AgentConsoleInputHistory';
import { AgentConsoleFocusLayers, DefaultAgentConsoleFocusLayers } from './AgentConsoleFocusLayers';
import { AgentConsoleOverlayController } from './AgentConsoleOverlay';
import type { AgentConsoleReviewAnnotation } from './AgentConsoleStateTypes';
import { formatAgentUiLabel } from './agent-ui.i18n';
import {
    getAnnotationCache as getAnnotationCacheInState,
    setAnnotationCache as setAnnotationCacheInState
} from './AgentConsoleReviewAnnotations';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleSessionActionsHost } from './AgentConsoleSessionActionsHost';

/** Locale defaults, translated labels and annotation cache facade. */
export abstract class AgentConsoleSessionLocaleHost extends AgentConsoleSessionActionsHost {
    protected localeOptionOverrides: Partial<Required<AgentConsoleOptions>> = {};
    protected hostProvidedOptions = new Set<string>();
    protected abstract self(): AgentConsoleSessionState;
    abstract translator?: import('@tsdi/i18n').TranslatorService;

    get inputFocused(): boolean {
        return !this.focusLayers.blocksComposerInput();
    }

    /** Align built-in labels and keyboard hints with the resolved host locale. */
    applyLocaleDefaults(locale?: string): void {
        const normalized = String(locale || '').trim().toLowerCase();
        this.localeOptionOverrides = normalized.startsWith('zh')
            ? { ...ZH_CONSOLE_HINTS, messageStatusLabels: ZH_MESSAGE_STATUS_LABELS, timelineLabels: DEFAULT_TIMELINE_LABELS }
            : normalized
                ? { messageStatusLabels: EN_MESSAGE_STATUS_LABELS, timelineLabels: EN_TIMELINE_LABELS }
                : {};
        for (const key of Object.keys(this.localeOptionOverrides)) {
            if (!this.hostProvidedOptions.has(key)) (this.consoleOptions as any)[key] = (this.localeOptionOverrides as any)[key];
        }
        // The plan row is built from translated copy; rebuild it when the host locale arrives.
        if (this.planTodos.length) this.planMessage = this.buildPlanMessage();
    }
    readonly inputHistoryController: AgentConsoleInputHistoryController = new DefaultAgentConsoleInputHistoryController(this as unknown as AgentConsoleSessionState);
    readonly focusLayers: AgentConsoleFocusLayers = new DefaultAgentConsoleFocusLayers(this as unknown as AgentConsoleSessionState);

    /** Derived from the focus layer stack: the composer owns the keyboard unless a layer claims it. */
    /** Localized labels for the inline suggestion menu (command groups, mention kinds). */
    suggestionLabels(): import('./AgentConsoleSuggestions').AgentConsoleSuggestionLabels {
        const label = (key: string, fallback: string) => this.translateLabel(key, undefined, fallback);
        return {
            describe: (key: string, fallback: string) => this.translateLabel(key, undefined, fallback),
            groupLabels: Object.fromEntries((['core', 'session', 'display', 'input', 'review', 'hooks', 'delegation', 'system'] as const)
                .map(group => [group, label(`agent.command.group.${group}`, group)])),
            mentionKinds: {
                folder: label('agent.mention.folder', 'folder'),
                directory: label('agent.mention.folder', 'folder'),
                file: label('agent.mention.file', 'file'),
                skill: label('agent.mention.skill', 'skill'),
                plugin: label('agent.mention.plugin', 'plugin')
            }
        };
    }

    /** Localized label for derived status/error strings (see formatAgentUiLabel). */
    translateLabel(key: string, params: Record<string, any> | undefined, fallback: string): string {
        return formatAgentUiLabel(this.translator, key, fallback, params);
    }

    getAnnotationCache(): Record<string, Record<string, AgentConsoleReviewAnnotation>> {
        return getAnnotationCacheInState(this.self());
    }
    setAnnotationCache(cache: Record<string, Record<string, AgentConsoleReviewAnnotation>>): void {
        setAnnotationCacheInState(this.self(), cache);
    }
    get timelineMode(): boolean {
        return this.timelineViewMode !== 'off';
    }
    get commandHints(): string[] {
        return agentConsoleAllCommandHints(this.injectedCommandHints);
    }

    setSuppressSuggestionMenu(suppressed: boolean): void { this.suppressSuggestionMenu = suppressed; }
    overlayController = new AgentConsoleOverlayController();
}
