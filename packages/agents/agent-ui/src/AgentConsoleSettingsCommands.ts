import { AGENT_CONSOLE_GLOBAL_ACTIONS } from './AgentConsoleKeymap';
import { formatAgentUiLabel, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

function settingsLabel(
    translator: AgentUiTranslator | null | undefined,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return formatAgentUiLabel(translator, key, fallback, params);
}

export interface AgentConsoleSettingsState {
    timelineViewMode: string;
    showCriticalMarks: boolean;
    showTimestamps: boolean;
    vimMode: boolean;
    messageLayout: 'scrollback' | 'viewport';
    setTimelineMode(mode: 'off' | 'compact' | 'steps' | 'verbose'): void;
    setShowCriticalMarks(value: boolean): void;
    setShowTimestamps(value: boolean): void;
    setVimMode(value: boolean): void;
    setMessageLayout(value: 'scrollback' | 'viewport' | 'stream'): void;
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
    onLayoutChanged?: () => void
): Promise<boolean> {
    const requested = String(args || '').trim().toLowerCase();
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

export async function openSettingsKeybindsTab(
    select: (title: string, options: any[], index: number, hint?: string) => Promise<string | undefined>,
    runKeymapCommand: (args: string) => Promise<any>,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    const action = await select(settingsLabel(translator, 'agent.menu.settings.keybindsTitle', 'Settings · Keybinds'), [
        { label: settingsLabel(translator, 'agent.menu.settings.keybindsList', 'List bindings'), value: 'list', description: settingsLabel(translator, 'agent.menu.settings.keybindsListDescription', 'show effective key bindings') },
        { label: settingsLabel(translator, 'agent.menu.settings.keybindsRecord', 'Record a key'), value: 'record', description: settingsLabel(translator, 'agent.menu.settings.keybindsRecordDescription', 'capture a key for an action') },
        { label: settingsLabel(translator, 'agent.menu.settings.keybindsReset', 'Reset to defaults'), value: 'reset', description: settingsLabel(translator, 'agent.menu.settings.keybindsResetDescription', 'restore default key bindings') }
    ], 0, settingsLabel(translator, 'agent.hint.enterSelectClose', 'enter select   esc close'));
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
        const target = await select(settingsLabel(translator, 'agent.menu.settings.recordKeyTitle', 'Settings · Record key'), AGENT_CONSOLE_GLOBAL_ACTIONS.map(name => ({
            label: name,
            value: name,
            description: settingsLabel(translator, 'agent.menu.settings.recordKeyDescription', 'press a key to bind after selecting')
        })), 0, settingsLabel(translator, 'agent.hint.enterSelectClose', 'enter select   esc close'));
        if (!target) return true;
        await runKeymapCommand(`record ${target}`);
        return true;
    }
    return true;
}

export interface SettingsPanelHost {
    state: any;
    options: any;
    translator?: (AgentUiTranslator & { currentLocale?: string; availableLocales?: string[]; setLocale(locale: string): void }) | undefined;
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
    const tab = await host.select(settingsLabel(host.translator, 'agent.menu.settings.title', 'Settings'), [
        {
            label: settingsLabel(host.translator, 'agent.menu.settings.tabGeneral', 'General'),
            value: 'general',
            description: settingsLabel(host.translator, 'agent.menu.settings.tabGeneralDescription', 'theme, language, input toggles')
        },
        {
            label: settingsLabel(host.translator, 'agent.menu.settings.tabKeybinds', 'Keybinds'),
            value: 'keybinds',
            description: settingsLabel(host.translator, 'agent.menu.settings.tabKeybindsDescription', 'record, conflict detection, reset')
        },
        {
            label: settingsLabel(host.translator, 'agent.menu.settings.tabProviders', 'Providers'),
            value: 'providers',
            description: settingsLabel(host.translator, 'agent.menu.settings.tabProvidersDescription', 'model profiles and provider')
        }
    ], 0, settingsLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close'));
    if (!tab) return true;
    if (tab === 'general') return openSettingsGeneralTab(host);
    if (tab === 'keybinds') return openSettingsKeybindsTab(host.select, args => host.runKeymapCommand(args), host.translator);
    if (tab === 'providers') return openSettingsProvidersTab(host);
    return true;
}

export async function openSettingsGeneralTab(host: SettingsPanelHost): Promise<boolean> {
    const onOff = (value: boolean) => value
        ? settingsLabel(host.translator, 'agent.menu.settings.stateOn', 'on')
        : settingsLabel(host.translator, 'agent.menu.settings.stateOff', 'off');
    const shownHidden = (value: boolean) => value
        ? settingsLabel(host.translator, 'agent.menu.settings.stateShown', 'shown')
        : settingsLabel(host.translator, 'agent.menu.settings.stateHidden', 'hidden');
    const option = await host.select(settingsLabel(host.translator, 'agent.menu.settings.generalTitle', 'Settings · General'), [
        { label: settingsLabel(host.translator, 'agent.menu.settings.themeLabel', 'Theme: {name}', { name: host.activeThemeName }), value: 'theme', description: settingsLabel(host.translator, 'agent.menu.settings.themeDescription', 'apply and save a UI theme') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.languageLabel', 'Language: {name}', { name: host.translator?.currentLocale || 'en' }), value: 'language', description: settingsLabel(host.translator, 'agent.menu.settings.languageDescription', 'switch UI language') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.vimLabel', 'Vim mode: {state}', { state: onOff(host.state.vimMode) }), value: 'vim', description: settingsLabel(host.translator, 'agent.menu.settings.vimDescription', 'vim-style normal/insert input mode') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.rawLabel', 'Raw mode: {state}', { state: onOff(host.state.rawMode) }), value: 'raw', description: settingsLabel(host.translator, 'agent.menu.settings.rawDescription', 'plain-text scrollback rendering') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.thinkingLabel', 'Thinking: {state}', { state: shownHidden(host.state.showThinking) }), value: 'thinking', description: settingsLabel(host.translator, 'agent.menu.settings.thinkingDescription', 'reasoning message visibility') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.yoloLabel', 'Yolo mode: {state}', { state: onOff(host.yoloMode) }), value: 'yolo', description: settingsLabel(host.translator, 'agent.menu.settings.yoloDescription', 'automatically approve gated tools') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.timestampsLabel', 'Timestamps: {state}', { state: shownHidden(host.state.showTimestamps) }), value: 'timestamps', description: settingsLabel(host.translator, 'agent.menu.settings.timestampsDescription', 'message timestamp visibility') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.toolOutputLabel', 'Tool output: {state}', { state: shownHidden(host.state.showToolOutput) }), value: 'tooloutput', description: settingsLabel(host.translator, 'agent.menu.settings.toolOutputDescription', 'tool output visibility in messages') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.usernameLabel', 'Username: {state}', { state: shownHidden(host.state.showUsername) }), value: 'username', description: settingsLabel(host.translator, 'agent.menu.settings.usernameDescription', 'username label visibility') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.windowTitleLabel', 'Window title: {state}', { state: onOff(host.options.ui?.terminalTitle !== false) }), value: 'title', description: settingsLabel(host.translator, 'agent.menu.settings.windowTitleDescription', 'terminal/document title sync') }
    ], 0, settingsLabel(host.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close'));
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
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'vimModeSaveFailed'));
        }
        return true;
    }
    if (option === 'raw') {
        return host.runRawModeCommand();
    }
    if (option === 'thinking') {
        host.state.setShowThinking(!host.state.showThinking);
        host.notify(host.state.showThinking ? formatAgentUiNotice(host.translator, 'showingReasoningMessages') : formatAgentUiNotice(host.translator, 'hidingReasoningMessages'));
        try {
            await host.persistSettings({ showThinking: host.state.showThinking });
        } catch (error: any) {
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'thinkingVisibilitySaveFailed'));
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
        host.notify(!enabled ? formatAgentUiNotice(host.translator, 'windowTitleSyncEnabled') : formatAgentUiNotice(host.translator, 'windowTitleSyncDisabled'));
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
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'toolOutputVisibilitySaveFailed'));
            return true;
        }
        host.notify(host.state.showToolOutput ? formatAgentUiNotice(host.translator, 'showingToolOutput') : formatAgentUiNotice(host.translator, 'hidingToolOutput'));
        return true;
    }
    if (option === 'username') {
        host.state.setShowUsername(!host.state.showUsername);
        try {
            await host.persistSettings({ showUsername: host.state.showUsername });
        } catch (error: any) {
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'usernameVisibilitySaveFailed'));
            return true;
        }
        host.notify(host.state.showUsername ? formatAgentUiNotice(host.translator, 'showingUsernameLabel') : formatAgentUiNotice(host.translator, 'hidingUsernameLabel'));
        return true;
    }
    return true;
}

export async function openSettingsLanguage(host: SettingsPanelHost): Promise<boolean> {
    const locales = host.translator?.availableLocales?.length
        ? host.translator.availableLocales
        : ['en', 'zh-CN'];
    const current = host.translator?.currentLocale || 'en';
    const selected = await host.select(settingsLabel(host.translator, 'agent.menu.settings.languageTitle', 'Settings · Language'), locales.map(locale => ({
        label: `${locale === current ? '● ' : '  '}${locale}`,
        value: locale,
        description: locale === current
            ? settingsLabel(host.translator, 'agent.menu.settings.languageCurrent', 'current language')
            : settingsLabel(host.translator, 'agent.menu.settings.languageSwitch', 'switch and save')
    })), Math.max(0, locales.indexOf(current)), settingsLabel(host.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close'));
    if (!selected) return true;
    host.translator?.setLocale(selected);
    host.state?.applyLocaleDefaults?.(selected);
    try {
        await host.persistSettings({ language: selected });
    } catch (error: any) {
        host.notify(error?.message || formatAgentUiNotice(host.translator, 'languageSwitchSaveFailed', { language: selected }));
        return true;
    }
    host.notify(formatAgentUiNotice(host.translator, 'languageSet', { selected: selected }));
    return true;
}

export async function openSettingsProvidersTab(host: SettingsPanelHost): Promise<boolean> {
    const option = await host.select(settingsLabel(host.translator, 'agent.menu.settings.providersTitle', 'Settings · Providers'), [
        { label: settingsLabel(host.translator, 'agent.menu.settings.providerModelProfiles', 'Model profiles'), value: 'model', description: settingsLabel(host.translator, 'agent.menu.settings.providerModelProfilesDescription', 'switch the active model profile') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.providerThinkingLevel', 'Thinking level: {level}', { level: host.modelReasoningEffort }), value: 'thinking-level', description: settingsLabel(host.translator, 'agent.menu.settings.providerThinkingLevelDescription', 'set model reasoning effort') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.providerFast', 'Fast/strong profile'), value: 'fast', description: settingsLabel(host.translator, 'agent.menu.settings.providerFastDescription', 'switch between fast and strong profiles') },
        { label: settingsLabel(host.translator, 'agent.menu.settings.providerStatus', 'Session status'), value: 'status', description: settingsLabel(host.translator, 'agent.menu.settings.providerStatusDescription', 'show current model / archetype / modes') }
    ], 0, settingsLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close'));
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
