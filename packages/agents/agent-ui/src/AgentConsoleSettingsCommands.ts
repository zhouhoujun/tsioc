import { AGENT_CONSOLE_GLOBAL_ACTIONS } from './AgentConsoleKeymap';

export interface AgentConsoleSettingsState {
    timelineViewMode: string;
    showCriticalMarks: boolean;
    showTimestamps: boolean;
    vimMode: boolean;
    setTimelineMode(mode: 'off' | 'compact' | 'steps' | 'verbose'): void;
    setShowCriticalMarks(value: boolean): void;
    setShowTimestamps(value: boolean): void;
    setVimMode(value: boolean): void;
}

export async function runTimelineModeCommand(
    args: string | undefined,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    persistSettings: (patch: Record<string, any>) => Promise<any>
): Promise<boolean> {
    const parsed = String(args || '').trim().toLowerCase();
    const modes: Array<'off' | 'compact' | 'steps' | 'verbose'> = ['off', 'compact', 'steps', 'verbose'];
    const labels: Record<string, string> = {
        off: 'Timeline view disabled.',
        compact: 'Timeline view: compact (current step + anomalies only).',
        steps: 'Timeline view: steps (default grouped view).',
        verbose: 'Timeline view: verbose (all events, diagnostic).'
    };
    let next: 'off' | 'compact' | 'steps' | 'verbose';
    if (parsed && modes.includes(parsed as any)) {
        next = parsed as 'off' | 'compact' | 'steps' | 'verbose';
    } else if (!parsed) {
        const current = state.timelineViewMode as 'off' | 'compact' | 'steps' | 'verbose';
        const idx = modes.indexOf(current);
        next = modes[(idx + 1) % modes.length];
    } else {
        notify(`Usage: /timeline [off|compact|steps|verbose]`);
        return true;
    }
    state.setTimelineMode(next);
    notify(labels[next]);
    try {
        await persistSettings({ timelineViewMode: next });
    } catch (error: any) {
        notify(error?.message || 'Failed to save timeline mode.');
    }
    return true;
}

export async function runDisplayCommand(
    args: string | undefined,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    persistSettings: (patch: Record<string, any>) => Promise<any>
): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    if (requested === 'critical') {
        state.setShowCriticalMarks(!state.showCriticalMarks);
        notify(state.showCriticalMarks
            ? 'Critical marking enabled: all messages marked and shown with priority.'
            : 'Critical marking disabled.');
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
        notify(error?.message || 'Failed to save timestamp visibility.');
        return true;
    }
    notify(state.showTimestamps ? 'Showing message timestamps.' : 'Hiding message timestamps.');
    return true;
}

export async function runVimCommand(
    args: string,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void
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
    notify(enabled
        ? 'Vim mode enabled — input starts in insert mode; press Esc for normal mode.'
        : 'Vim mode disabled.');
}

export async function runExperimentalCommand(
    args: string | undefined,
    options: any,
    notify: (message: string) => void
): Promise<boolean> {
    const parsed = String(args || '').trim();
    const parts = parsed.split(/\s+/).filter(Boolean);
    const experimental = { ...((options.ui?.experimental || {}) as Record<string, boolean>) };
    if (!parts.length) {
        if (!Object.keys(experimental).length) {
            notify('No experimental features enabled. Use /experimental <name> on|off.');
            return true;
        }
        const lines = Object.entries(experimental).map(([name, enabled]) => `${enabled ? 'on' : 'off'} ${name}`);
        notify(`Experimental features:\n${lines.join('\n')}`);
        return true;
    }
    const [name, value] = parts;
    if (!name || (value !== 'on' && value !== 'off')) {
        notify('Usage: /experimental [<name> on|off]');
        return true;
    }
    experimental[name] = value === 'on';
    options.ui = { ...(options.ui || {}), experimental };
    notify(`Experimental feature "${name}" ${value === 'on' ? 'enabled' : 'disabled'}.`);
    return true;
}

export async function openSettingsKeybindsTab(
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    runKeymapCommand: (args: string) => Promise<any>
): Promise<boolean> {
    const action = await select('Settings · Keybinds', [
        { label: 'List bindings', value: 'list', description: 'show effective key bindings' },
        { label: 'Record a key', value: 'record', description: 'capture a key for an action' },
        { label: 'Reset to defaults', value: 'reset', description: 'restore default key bindings' }
    ], 0, 'enter select   esc close');
    if (!action) return true;
    if (action === 'list') {
        await runKeymapCommand('list');
        return true;
    }
    if (action === 'reset') {
        await runKeymapCommand('reset');
        return true;
    }
    if (action === 'record') {
        const target = await select('Settings · Record key', AGENT_CONSOLE_GLOBAL_ACTIONS.map(name => ({
            label: name,
            value: name,
            description: 'press a key to bind after selecting'
        })), 0, 'enter select   esc close');
        if (!target) return true;
        await runKeymapCommand(`record ${target}`);
        return true;
    }
    return true;
}
