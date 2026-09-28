import { AGENT_CONSOLE_GLOBAL_ACTIONS } from './AgentConsoleKeymap';

export interface AgentConsoleSettingsState {
    timelineViewMode: string;
    showCriticalMarks: boolean;
    showTimestamps: boolean;
    vimMode: boolean;
    messageLayout: 'stream' | 'viewport';
    setTimelineMode(mode: 'off' | 'compact' | 'steps' | 'verbose'): void;
    setShowCriticalMarks(value: boolean): void;
    setShowTimestamps(value: boolean): void;
    setVimMode(value: boolean): void;
    setMessageLayout(value: 'stream' | 'viewport'): void;
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

export async function runLayoutCommand(
    args: string | undefined,
    state: AgentConsoleSettingsState,
    notify: (message: string) => void,
    persistSettings: (patch: Record<string, any>) => Promise<any>
): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
    let next: 'stream' | 'viewport';
    if (!requested) {
        next = state.messageLayout === 'viewport' ? 'stream' : 'viewport';
    } else if (requested === 'stream' || requested === 'native' || requested === 'scrollback') {
        next = 'stream';
    } else if (requested === 'viewport' || requested === 'dynamic' || requested === 'window' || requested === 'windowed') {
        next = 'viewport';
    } else {
        notify('Usage: /layout [stream|viewport]');
        return true;
    }
    state.setMessageLayout(next);
    notify(next === 'viewport'
        ? 'Layout: windowed (viewport only; long content collapsed).'
        : 'Layout: stream (native scrollback; full history).');
    try {
        await persistSettings({ messageLayout: next });
    } catch (error: any) {
        notify(error?.message || 'Failed to save layout mode.');
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

export interface SettingsPanelHost {
    state: any;
    options: any;
    translator?: { currentLocale?: string; availableLocales?: string[]; setLocale(locale: string): void } | undefined;
    activeThemeName: string;
    yoloMode: boolean;
    modelReasoningEffort: string;
    select(title: string, options: any[], index: number, hint?: string): Promise<string | undefined>;
    notify(message: string): void;
    runThemeCommand(): Promise<any>;
    runVimCommand(args?: string): Promise<any>;
    runDisplayCommand(args?: string): Promise<any>;
    runLayoutCommand(args?: string): Promise<any>;
    runRawModeCommand(): Promise<any>;
    runFastCommand(args?: string): Promise<any>;
    runStatusCommand(): Promise<any>;
    runKeymapCommand(args: string): Promise<any>;
    openModelSwitcher(): Promise<any>;
    openSettingsThinkingLevel(): Promise<boolean>;
    openSettingsLanguage(): Promise<boolean>;
    setYoloMode(enabled: boolean, notify?: boolean): Promise<void>;
    persistSettings(patch: any): Promise<void>;
}

export async function runSettingsCommand(host: SettingsPanelHost): Promise<boolean> {
    const tab = await host.select('Settings', [
        { label: 'General', value: 'general', description: 'theme, language, input toggles' },
        { label: 'Keybinds', value: 'keybinds', description: 'record, conflict detection, reset' },
        { label: 'Providers', value: 'providers', description: 'model profiles and provider' }
    ], 0, 'enter select   esc close');
    if (!tab) return true;
    if (tab === 'general') return openSettingsGeneralTab(host);
    if (tab === 'keybinds') return openSettingsKeybindsTab(host.select, args => host.runKeymapCommand(args));
    if (tab === 'providers') return openSettingsProvidersTab(host);
    return true;
}

export async function openSettingsGeneralTab(host: SettingsPanelHost): Promise<boolean> {
    const option = await host.select('Settings · General', [
        { label: `Theme: ${host.activeThemeName}`, value: 'theme', description: 'apply and save a UI theme' },
        { label: `Language: ${host.translator?.currentLocale || 'en'}`, value: 'language', description: 'switch UI language' },
        { label: `Vim mode: ${host.state.vimMode ? 'on' : 'off'}`, value: 'vim', description: 'vim-style normal/insert input mode' },
        { label: `Raw mode: ${host.state.rawMode ? 'on' : 'off'}`, value: 'raw', description: 'plain-text scrollback rendering' },
        { label: `Thinking: ${host.state.showThinking ? 'shown' : 'hidden'}`, value: 'thinking', description: 'reasoning message visibility' },
        { label: `Yolo mode: ${host.yoloMode ? 'on' : 'off'}`, value: 'yolo', description: 'automatically approve gated tools' },
        { label: `Timestamps: ${host.state.showTimestamps ? 'shown' : 'hidden'}`, value: 'timestamps', description: 'message timestamp visibility' },
        { label: `Tool output: ${host.state.showToolOutput ? 'shown' : 'hidden'}`, value: 'tooloutput', description: 'tool output visibility in messages' },
        { label: `Username: ${host.state.showUsername ? 'shown' : 'hidden'}`, value: 'username', description: 'username label visibility' },
        { label: `Window title: ${host.options.ui?.terminalTitle === false ? 'off' : 'on'}`, value: 'title', description: 'terminal/document title sync' }
    ], 0, 'enter apply   esc close');
    if (!option) return true;
    if (option === 'theme') {
        await host.runThemeCommand();
        return true;
    }
    if (option === 'language') {
        return host.openSettingsLanguage();
    }
    if (option === 'vim') {
        await host.runVimCommand('');
        try {
            await host.persistSettings({ vimMode: host.state.vimMode });
        } catch (error: any) {
            host.notify(error?.message || 'Failed to save vim mode.');
        }
        return true;
    }
    if (option === 'raw') {
        return host.runRawModeCommand();
    }
    if (option === 'thinking') {
        host.state.setShowThinking(!host.state.showThinking);
        host.notify(host.state.showThinking ? 'Showing reasoning messages.' : 'Hiding reasoning messages.');
        try {
            await host.persistSettings({ showThinking: host.state.showThinking });
        } catch (error: any) {
            host.notify(error?.message || 'Failed to save thinking visibility.');
        }
        return true;
    }
    if (option === 'yolo') {
        await host.setYoloMode(!host.yoloMode);
        return true;
    }
    if (option === 'title') {
        const enabled = host.options.ui?.terminalTitle !== false;
        host.options.ui = { ...(host.options.ui || {}), terminalTitle: !enabled };
        host.notify(!enabled ? 'Window title sync enabled.' : 'Window title sync disabled.');
        return true;
    }
    if (option === 'timestamps') {
        return host.runDisplayCommand('');
    }
    if (option === 'tooloutput') {
        host.state.setShowToolOutput(!host.state.showToolOutput);
        try {
            await host.persistSettings({ showToolOutput: host.state.showToolOutput });
        } catch (error: any) {
            host.notify(error?.message || 'Failed to save tool output visibility.');
            return true;
        }
        host.notify(host.state.showToolOutput ? 'Showing tool output in messages.' : 'Hiding tool output in messages.');
        return true;
    }
    if (option === 'username') {
        host.state.setShowUsername(!host.state.showUsername);
        try {
            await host.persistSettings({ showUsername: host.state.showUsername });
        } catch (error: any) {
            host.notify(error?.message || 'Failed to save username visibility.');
            return true;
        }
        host.notify(host.state.showUsername ? 'Showing the username label.' : 'Hiding the username label.');
        return true;
    }
    return true;
}

export async function openSettingsLanguage(host: SettingsPanelHost): Promise<boolean> {
    const locales = host.translator?.availableLocales?.length
        ? host.translator.availableLocales
        : ['en', 'zh-CN'];
    const current = host.translator?.currentLocale || 'en';
    const selected = await host.select('Settings · Language', locales.map(locale => ({
        label: `${locale === current ? '● ' : '  '}${locale}`,
        value: locale,
        description: locale === current ? 'current language' : 'switch and save'
    })), Math.max(0, locales.indexOf(current)), 'enter apply   esc close');
    if (!selected) return true;
    host.translator?.setLocale(selected);
    try {
        await host.persistSettings({ language: selected });
    } catch (error: any) {
        host.notify(error?.message || `Switched to ${selected}, but failed to save the language.`);
        return true;
    }
    host.notify(`Language set to ${selected}.`);
    return true;
}

export async function openSettingsProvidersTab(host: SettingsPanelHost): Promise<boolean> {
    const option = await host.select('Settings · Providers', [
        { label: 'Model profiles', value: 'model', description: 'switch the active model profile' },
        { label: `Thinking level: ${host.modelReasoningEffort}`, value: 'thinking-level', description: 'set model reasoning effort' },
        { label: 'Fast/strong profile', value: 'fast', description: 'switch between fast and strong profiles' },
        { label: 'Session status', value: 'status', description: 'show current model / archetype / modes' }
    ], 0, 'enter select   esc close');
    if (!option) return true;
    if (option === 'model') {
        await host.openModelSwitcher();
        return true;
    }
    if (option === 'thinking-level') {
        return host.openSettingsThinkingLevel();
    }
    if (option === 'fast') {
        return host.runFastCommand();
    }
    if (option === 'status') {
        await host.runStatusCommand();
        return true;
    }
    return true;
}
