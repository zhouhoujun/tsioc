import { AGENT_CONSOLE_GLOBAL_ACTIONS } from './AgentConsoleKeymap';
import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import type { AgentConsoleSettingsState } from './AgentConsoleSettingsCommands';

export function settingsLabel(
    translator: AgentUiTranslator | null | undefined,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, key, fallback, params);
}

export async function runTimelineModeCommand(
    args: string | undefined,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    persistSettings: (patch: Record<string, any>) => Promise<any>,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    const parsed = String(args || '').trim().toLowerCase();
    const modes: Array<'off' | 'compact' | 'steps' | 'verbose'> = ['off', 'compact', 'steps', 'verbose'];
    const labelKeys: Record<string, string> = {
        off: 'timelineModeOff',
        compact: 'timelineModeCompact',
        steps: 'timelineModeSteps',
        verbose: 'timelineModeVerbose'
    };
    let next: 'off' | 'compact' | 'steps' | 'verbose';
    if (parsed && modes.includes(parsed as any)) {
        next = parsed as 'off' | 'compact' | 'steps' | 'verbose';
    } else if (!parsed) {
        const current = state.timelineViewMode as 'off' | 'compact' | 'steps' | 'verbose';
        const idx = modes.indexOf(current);
        next = modes[(idx + 1) % modes.length];
    } else {
        notify(formatAgentUiNotice(translator, 'timelineUsage'));
        return true;
    }
    state.setTimelineMode(next);
    notify(formatAgentUiNotice(translator, labelKeys[next]));
    try {
        await persistSettings({ timelineViewMode: next });
    } catch (error: any) {
        notify(error?.message || formatAgentUiNotice(translator, 'timelineSaveFailed'));
    }
    return true;
}

/** Apply a persisted transcript layout and report whether the mode actually changed. */
export function applyPersistedLayout(
    state: AgentConsoleSettingsState,
    persisted: { messageLayout?: string } | null | undefined,
    onChanged?: () => void
): void {
    if (!persisted?.messageLayout) {
        return;
    }
    const before = state.messageLayout;
    state.setMessageLayout(persisted.messageLayout === 'scrollback' || persisted.messageLayout === 'stream' ? 'scrollback' : 'viewport');
    if (state.messageLayout !== before) {
        onChanged?.();
    }
}

/** Map `/tui` buffer-mode names onto the transcript layout values. */
export function mapTuiLayoutArg(value: string | undefined): string {
    const mode = String(value || '').trim().toLowerCase();
    return mode === 'fullscreen' ? 'viewport' : mode;
}

export async function runLayoutCommand(
    args: string | undefined,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    persistSettings: (patch: Record<string, any>) => Promise<any>,
    translator?: AgentUiTranslator | null,
    onLayoutChanged?: () => void,
    select?: (title: string, options: any[], selectedIndex: number, hint?: string) => Promise<string | undefined>
): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    if (!requested && select) {
        const current = state.messageLayout === 'scrollback' ? 'scrollback' : 'viewport';
        const options = [
            {
                label: `${formatAgentUiNotice(translator, 'layoutViewport')}${current === 'viewport' ? ` ${formatAgentUiNotice(translator, 'layoutCurrentMarker')}` : ''}`,
                value: 'viewport',
                description: formatAgentUiNotice(translator, 'layoutViewportDescription')
            },
            {
                label: `${formatAgentUiNotice(translator, 'layoutScrollback')}${current === 'scrollback' ? ` ${formatAgentUiNotice(translator, 'layoutCurrentMarker')}` : ''}`,
                value: 'scrollback',
                description: formatAgentUiNotice(translator, 'layoutScrollbackDescription')
            }
        ];
        const selected = await select(
            formatAgentUiNotice(translator, 'layoutTitle'),
            options,
            current === 'scrollback' ? 1 : 0,
            formatAgentUiNotice(translator, 'layoutHint')
        );
        if (!selected) {
            return true;
        }
        return runLayoutCommand(selected, state, notify, persistSettings, translator, onLayoutChanged);
    }
    let next: 'scrollback' | 'viewport';
    if (!requested) {
        next = state.messageLayout === 'viewport' ? 'scrollback' : 'viewport';
    } else if (requested === 'scrollback' || requested === 'native') {
        next = 'scrollback';
    } else if (requested === 'viewport' || requested === 'fullscreen' || requested === 'dynamic' || requested === 'window' || requested === 'windowed') {
        next = 'viewport';
    } else {
        notify(formatAgentUiNotice(translator, 'layoutUsage'));
        return true;
    }
    const changed = state.messageLayout !== next;
    state.setMessageLayout(next);
    notify(formatAgentUiNotice(translator, next === 'viewport' ? 'layoutViewportSet' : 'layoutScrollbackSet'));
    try {
        await persistSettings({ messageLayout: next });
    } catch (error: any) {
        notify(error?.message || formatAgentUiNotice(translator, 'layoutSaveFailed'));
    }
    if (changed) {
        onLayoutChanged?.();
    }
    return true;
}

export async function runDisplayCommand(
    args: string | undefined,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    persistSettings: (patch: Record<string, any>) => Promise<any>,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    if (requested === 'critical') {
        state.setShowCriticalMarks(!state.showCriticalMarks);
        notify(formatAgentUiNotice(translator, state.showCriticalMarks ? 'criticalMarksEnabled' : 'criticalMarksDisabled'));
        return true;
    }
    const current = state.showTimestamps;
    if (requested === 'on' || requested === 'show') {
        state.setShowTimestamps(true);
    } else if (requested === 'off' || requested === 'hide') {
        state.setShowTimestamps(false);
    } else {
        state.setShowTimestamps(!current);
    }
    try {
        await persistSettings({ showTimestamps: state.showTimestamps });
    } catch (error: any) {
        notify(error?.message || formatAgentUiNotice(translator, 'timestampVisibilitySaveFailed'));
        return true;
    }
    notify(formatAgentUiNotice(translator, state.showTimestamps ? 'showingTimestamps' : 'hidingTimestamps'));
    return true;
}

export async function runVimCommand(
    args: string,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    translator?: AgentUiTranslator | null
): Promise<void> {
    const raw = String(args || '').trim().toLowerCase();
    let enabled: boolean;
    if (raw === 'on' || raw === '1' || raw === 'true') {
        enabled = true;
    } else if (raw === 'off' || raw === '0' || raw === 'false') {
        enabled = false;
    } else {
        enabled = !state.vimMode;
    }
    state.setVimMode(enabled);
    notify(formatAgentUiNotice(translator, enabled ? 'vimEnabled' : 'vimDisabled'));
}
