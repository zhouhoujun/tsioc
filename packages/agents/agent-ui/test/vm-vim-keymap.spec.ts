import expect = require('expect');
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createReadStream } from 'fs';
import { Suite, Test } from '@tsdi/unit';
import { AudioCaptureAdapter, AudioCaptureSessionEvents, AudioPlaybackAdapter, AudioPlaybackOptions, Encodings, FileAdapter, FileDirectoryEntry, IReadable } from '@tsdi/common';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentCompensationEvent,
    MemoryStore,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent,
    InMemoryCommandExecutionControl,
    normalizeAgentWorkspaceIdentity
} from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleInputHistoryStore,
    AgentConsoleInputPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleApprovalRequest,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    AgentConsoleSessionChoice,
    AgentConsoleSessionProjectGroup,
    AgentConsoleWorkspaceMentionsProvider,
    AgentConsoleKeymap,
    AgentConsoleKeymapStore,
    AgentConsoleSettingsStore,
    AgentConsoleThemeStore,
    agentConsoleThemes,
    AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP,
    AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP,
    reduceAgentConsoleCommandExecution,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    AgentConsoleCommandExecution
} from '../src';
import { runAgentUiOrmApp } from '../testing/agent-orm';
import {TestFileAdapter, AudioCaptureStub, AudioPlaybackStub, RuntimeStub, FailingRuntimeStub, SchedulerStub, ToolRegistryStub, EventMulticasterStub, ApplicationContextStub, AppRpcStub, SessionServiceStub, createDeferred, createConsole, createConsoleParts, waitForCondition} from './_helpers';

@Suite('Agent console vim/keymap/settings')
export class VmVimKeymapTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('vim mode is disabled by default and does not intercept keys')
    async vimModeDisabledByDefault() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.vimMode).toEqual(false);
        expect(state.inputMode).toEqual('insert');
        expect(state.handleVimKey('h')).toEqual(false);
        expect(state.handleVimKey('d')).toEqual(false);
    }

    @Test('vim normal mode executes cursor and edit actions')
    async vimNormalModeExecutesCursorAndEditActions() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        state.setInputMode('normal');
        state.setInput('abc');

        expect(state.handleVimKey('h')).toEqual(true);
        expect(state.inputCursor).toEqual(2);
        expect(state.handleVimKey('l')).toEqual(true);
        expect(state.inputCursor).toEqual(3);
        expect(state.handleVimKey('0')).toEqual(true);
        expect(state.inputCursor).toEqual(0);
        expect(state.handleVimKey('$')).toEqual(true);
        expect(state.inputCursor).toEqual(3);

        state.setInput('abc', 1);
        expect(state.handleVimKey('x')).toEqual(true);
        expect(state.input).toEqual('ac');
        expect(state.inputCursor).toEqual(1);
    }

    @Test('vim dd pending sequence deletes the input line')
    async vimDdPendingSequenceDeletesLine() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        state.setInputMode('normal');
        state.setInput('abc');

        expect(state.handleVimKey('d')).toEqual(true);
        expect(state.vimPendingKey).toEqual('d');
        expect(state.input).toEqual('abc');

        expect(state.handleVimKey('d')).toEqual(true);
        expect(state.vimPendingKey).toEqual('');
        expect(state.input).toEqual('');
        expect(state.inputCursor).toEqual(0);
    }

    @Test('vim broken pending sequence resets without acting')
    async vimBrokenPendingSequenceResets() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        state.setInputMode('normal');
        state.setInput('abc', 1);

        expect(state.handleVimKey('d')).toEqual(true);
        expect(state.vimPendingKey).toEqual('d');
        expect(state.handleVimKey('x')).toEqual(false);
        expect(state.vimPendingKey).toEqual('');
        expect(state.input).toEqual('abc');
    }

    @Test('vim normal mode navigates input history with k and j')
    async vimNormalModeNavigatesHistory() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        state.setInputMode('normal');
        state.pushInputHistory('first');
        state.pushInputHistory('second');

        expect(state.handleVimKey('k')).toEqual(true);
        expect(state.input).toEqual('second');
        expect(state.handleVimKey('k')).toEqual(true);
        expect(state.input).toEqual('first');
        expect(state.handleVimKey('j')).toEqual(true);
        expect(state.input).toEqual('second');
    }

    @Test('vim insert mode passes keys through and exit returns to normal')
    async vimInsertModePassesThrough() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        expect(state.inputMode).toEqual('insert');
        expect(state.handleVimKey('h')).toEqual(false);

        state.setInputMode('normal');
        expect(state.inputMode).toEqual('normal');
        state.setInputMode('normal');
        expect(state.inputMode).toEqual('normal');

        state.setVimMode(false);
        expect(state.vimMode).toEqual(false);
        expect(state.inputMode).toEqual('insert');
        state.setInputMode('normal');
        expect(state.inputMode).toEqual('insert');
    }

    @Test('vim insert actions reposition the cursor before entering insert mode')
    async vimInsertActionsRepositionCursor() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        state.setInputMode('normal');
        state.setInput('abc');

        state.handleVimKey('I');
        expect(state.inputMode).toEqual('insert');
        expect(state.inputCursor).toEqual(0);

        state.setInputMode('normal');
        state.handleVimKey('A');
        expect(state.inputMode).toEqual('insert');
        expect(state.inputCursor).toEqual(3);

        state.setInputMode('normal');
        state.handleVimKey('o');
        expect(state.inputMode).toEqual('insert');
        expect(state.input).toEqual('abc\n');
        expect(state.inputCursor).toEqual(4);

        state.setInputMode('normal');
        state.handleVimKey('O');
        expect(state.inputMode).toEqual('insert');
        expect(state.input).toEqual('\nabc\n');
        expect(state.inputCursor).toEqual(0);
    }

    @Test('terminal escape in vim insert mode returns to normal mode')
    async terminalEscapeReturnsToNormalMode() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);
        expect(state.inputMode).toEqual('insert');

        const result = await state.processDecodedInput(
            { text: '\u001b', partial: false },
            '\u001b',
            {
                isClosed: false,
                onExit() {},
                hasActiveTextPrompt: false
            }
        );

        expect(result.handled).toEqual(true);
        expect(state.inputMode).toEqual('normal');
    }

    @Test('terminal escape without vim keeps existing escape behavior')
    async terminalEscapeWithoutVimKeepsEscapeBehavior() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setInputMode('normal');
        expect(state.inputMode).toEqual('insert');

        const result = await state.processDecodedInput(
            { text: '\u001b', partial: false },
            '\u001b',
            {
                isClosed: false,
                onExit() {},
                hasActiveTextPrompt: false
            }
        );

        expect(result.handled).toEqual(true);
        expect(state.inputMode).toEqual('insert');
    }

    @Test('input panel prompt shows a vim mode badge with the current mode')
    async inputPromptShowsVimBadge() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.inputPrompt = '>';
        const panel = new AgentConsoleInputPanelComponent(state);
        expect(panel.inputPrompt).toEqual('>');

        state.setVimMode(true);
        expect(panel.inputPrompt).toEqual('> · vim insert');

        state.setInputMode('normal');
        expect(panel.inputPrompt).toEqual('> · vim normal');

        state.setPlanMode(true);
        expect(panel.inputPrompt).toEqual('> · plan · vim normal');
    }

    @Test('vim custom keymap overrides, unsets, and resets bindings')
    async vimCustomKeymapOverrideUnsetReset() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setVimMode(true);

        expect(state.effectiveVimBindings.h).toEqual('cursor-left');
        expect(state.setVimBinding('h', 'cursor-right')).toEqual(true);
        expect(state.effectiveVimBindings.h).toEqual('cursor-right');

        expect(state.setVimBinding('q', 'delete-line')).toEqual(true);
        expect(state.effectiveVimBindings.q).toEqual('delete-line');

        expect(state.unsetVimBinding('h')).toEqual(true);
        expect(state.effectiveVimBindings.h).toEqual('cursor-left');
        expect(state.unsetVimBinding('h')).toEqual(false);

        state.resetVimBindings();
        expect(state.effectiveVimBindings.q).toEqual(undefined);
        expect(state.effectiveVimBindings.h).toEqual('cursor-left');
    }

    @Test('vim binding setter rejects unknown actions')
    async vimBindingSetterRejectsUnknownActions() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.setVimBinding('q', 'bogus-action')).toEqual(false);
        expect(state.setVimBinding('', 'delete-line')).toEqual(false);
        expect(state.effectiveVimBindings.q).toEqual(undefined);
    }

    @Test('vim command toggles the session vim mode')
    async vimCommandTogglesVimMode() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());

        await (component as any).handleCommand('/vim');
        expect(state.vimMode).toEqual(true);
        expect(state.notice).toContain('Vim mode enabled');

        await (component as any).handleCommand('/vim off');
        expect(state.vimMode).toEqual(false);
        expect(state.notice).toContain('Vim mode disabled');

        await (component as any).handleCommand('/vim on');
        expect(state.vimMode).toEqual(true);
    }

    @Test('keymap command sets, lists, unsets, and resets bindings')
    async keymapCommandSetListUnsetReset() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());

        await (component as any).handleCommand('/keymap set q delete-line');
        expect(state.effectiveVimBindings.q).toEqual('delete-line');

        await (component as any).handleCommand('/keymap list');
        expect(state.notice).toContain('q -> delete-line');

        await (component as any).handleCommand('/keymap unset q');
        expect(state.effectiveVimBindings.q).toEqual(undefined);

        await (component as any).handleCommand('/keymap set q delete-line');
        await (component as any).handleCommand('/keymap reset');
        expect(state.effectiveVimBindings.q).toEqual(undefined);

        await (component as any).handleCommand('/keymap set q bogus');
        expect(state.notice).toContain('Unknown keymap action');
    }

    @Test('global keymap resolves defaults overrides and disabled defaults')
    async globalKeymapResolvesOverrides() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('ctrl+x s')).toEqual('status');
        expect(keymap.resolve('ctrl+p')).toEqual('command-palette');
        expect(keymap.resolve('ctrl+x t')).toEqual('toggle-thinking');
        expect(keymap.resolve('ctrl+x shift+t')).toEqual('theme');
        expect(keymap.set('ctrl+g', 'sessions')).toEqual(true);
        expect(keymap.resolve('ctrl+g')).toEqual('sessions');
        expect(keymap.unset('ctrl+x,s')).toEqual(true);
        expect(keymap.resolve('ctrl+x s')).toEqual(undefined);
        expect(keymap.set('ctrl+g', 'bogus')).toEqual(false);
        keymap.reset();
        expect(keymap.resolve('ctrl+x s')).toEqual('status');
    }

    @Test('global keymap store persists workspace bindings through file adapter')
    async globalKeymapStorePersistsWorkspaceBindings() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-keymap-'));
        try {
            const store = new AgentConsoleKeymapStore(new TestFileAdapter());
            await store.save(workspace, { 'ctrl+g': 'status', 'ctrl+x s': null });
            expect(await store.load(workspace)).toEqual({ 'ctrl+g': 'status', 'ctrl+x s': null });
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('theme store persists a workspace theme through file adapter')
    async themeStorePersistsWorkspaceTheme() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-theme-'));
        try {
            const store = new AgentConsoleThemeStore(new TestFileAdapter());
            await store.save(workspace, 'solarized');
            expect(await store.load(workspace)).toEqual('solarized');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('console restores the persisted workspace theme on init')
    async consoleRestoresPersistedWorkspaceTheme() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-theme-restore-'));
        try {
            const store = new AgentConsoleThemeStore(new TestFileAdapter());
            await store.save(workspace, 'solarized');
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            (component as any).themeStore = store;

            await component.onInit();

            expect(component.sessionState.theme).toEqual(agentConsoleThemes.solarized);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('theme command applies built-in themes and rejects unknown names')
    async themeCommandAppliesBuiltInTheme() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await (component as any).handleCommand('/theme light');
        expect(component.sessionState.theme).toEqual(agentConsoleThemes.light);
        expect(component.notice).toEqual('Theme set to light.');

        await (component as any).handleCommand('/theme ultraviolet');
        expect(component.notice).toContain('Unknown theme');
        expect(component.sessionState.theme).toEqual(agentConsoleThemes.light);
    }

    @Test('theme command opens a preset selector and applies its selection')
    async themeCommandOpensPresetSelector() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        const pending = (component as any).handleCommand('/theme');
        expect(component.selectMenu?.title).toEqual('Theme');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['dark', 'light', 'solarized', 'high-contrast']);
        await component.sessionState.confirmSelectMenu('high-contrast');
        await pending;

        expect(component.sessionState.theme).toEqual(agentConsoleThemes['high-contrast']);
        expect(component.notice).toEqual('Theme set to high-contrast.');
    }

    @Test('thinking command toggles reasoning message visibility')
    async thinkingCommandTogglesReasoningVisibility() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        expect(component.sessionState.showThinking).toEqual(true);
        await (component as any).handleCommand('/thinking off');
        expect(component.sessionState.showThinking).toEqual(false);
        expect(component.notice).toEqual('Hiding reasoning messages.');

        await (component as any).handleCommand('/thinking on');
        expect(component.sessionState.showThinking).toEqual(true);
        expect(component.notice).toEqual('Showing reasoning messages.');

        await (component as any).handleCommand('/thinking');
        expect(component.sessionState.showThinking).toEqual(false);
        expect(component.notice).toEqual('Hiding reasoning messages.');
    }

    @Test('terminal leader ctrl+x t toggles thinking and ctrl+x shift+t opens theme selector')
    async terminalLeaderToggleThinkingAndShiftedTheme() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
        await (component as any).handleTerminalInput({ text: 't', partial: false }, 't');
        expect(component.sessionState.showThinking).toEqual(false);

        await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
        const pending = (component as any).handleGlobalKeyInput('T');
        expect(component.selectMenu?.title).toEqual('Theme');
        await component.sessionState.confirmSelectMenu('dark');
        await pending;
    }

    @Test('settings store persists language, vim mode and thinking visibility')
    async settingsStorePersistsWorkspaceSettings() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-settings-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { language: 'zh-CN', vimMode: true, showThinking: false, thinkingLevel: 'high' });
            expect(await store.load(workspace)).toEqual({ language: 'zh-CN', vimMode: true, showThinking: false, thinkingLevel: 'high' });
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('console restores persisted settings on init')
    async consoleRestoresPersistedWorkspaceSettings() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-settings-restore-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { vimMode: true, showThinking: false });
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            (component as any).settingsStore = store;

            await component.onInit();

            expect(component.sessionState.vimMode).toEqual(true);
            expect(component.sessionState.showThinking).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('settings command opens tab selector and general tab applies vim mode with persistence')
    async settingsCommandOpensTabSelectorAndAppliesGeneralToggle() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-settings-tabs-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            await component.onInit();

            const pending = (component as any).handleCommand('/settings');
            await waitForCondition(() => !!component.selectMenu);
            expect(component.selectMenu?.title).toEqual('Settings');
            expect(component.selectMenu?.options.map(option => option.value)).toEqual(['general', 'keybinds', 'providers']);

            await component.sessionState.confirmSelectMenu('general');
            await waitForCondition(() => component.selectMenu?.title === 'Settings · General');
            expect(component.selectMenu?.options.map(option => option.value)).toEqual(['theme', 'language', 'vim', 'raw', 'thinking', 'yolo', 'timestamps', 'tooloutput', 'username', 'title']);

            await component.sessionState.confirmSelectMenu('vim');
            await pending;

            expect(component.sessionState.vimMode).toEqual(true);
            expect(await store.load(workspace)).toEqual({ vimMode: true });
            expect(component.notice).toContain('Vim mode enabled');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('settings general tab language option switches the translator locale')
    async settingsLanguageOptionSwitchesLocale() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        const translator = {
            currentLocale: 'en',
            setLocale(locale: string) {
                (this as any).currentLocale = locale;
            },
            availableLocales: ['en', 'zh-CN']
        };
        (component as any).translator = translator;

        const pending = (component as any).handleCommand('/settings');
        await waitForCondition(() => !!component.selectMenu);
        await component.sessionState.confirmSelectMenu('general');
        await waitForCondition(() => component.selectMenu?.title === 'Settings · General');
        await component.sessionState.confirmSelectMenu('language');
        await waitForCondition(() => component.selectMenu?.title === 'Settings · Language');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['en', 'zh-CN']);

        await component.sessionState.confirmSelectMenu('zh-CN');
        await pending;

        expect(translator.currentLocale).toEqual('zh-CN');
        expect(component.notice).toContain('Language set to zh-CN');
    }

    @Test('settings keybinds tab records a key for an action')
    async settingsKeybindsTabRecordsKey() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        const pending = (component as any).handleCommand('/settings');
        await waitForCondition(() => !!component.selectMenu);
        await component.sessionState.confirmSelectMenu('keybinds');
        await waitForCondition(() => component.selectMenu?.title === 'Settings · Keybinds');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['list', 'record', 'reset']);

        await component.sessionState.confirmSelectMenu('record');
        await waitForCondition(() => component.selectMenu?.title === 'Settings · Record key');

        await component.sessionState.confirmSelectMenu('interrupt-turn');
        await pending;

        expect((component as any).keymapRecording).toEqual({ context: 'global', action: 'interrupt-turn' });
        expect(component.notice).toContain('Recording key for interrupt-turn');
    }

    @Test('settings keybinds tab reset restores default bindings')
    async settingsKeybindsTabResetsBindings() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        (component as any).globalKeymap.set('ctrl+y', 'interrupt-turn', 'global');

        const pending = (component as any).handleCommand('/settings');
        await waitForCondition(() => !!component.selectMenu);
        await component.sessionState.confirmSelectMenu('keybinds');
        await waitForCondition(() => component.selectMenu?.title === 'Settings · Keybinds');
        await component.sessionState.confirmSelectMenu('reset');
        await pending;

        expect(component.notice).toContain('Keymap reset to defaults');
        expect((component as any).globalKeymap.resolve('ctrl+y', 'global')).toBeUndefined();
    }

    @Test('settings providers tab selects and persists thinking level')
    async settingsProvidersTabSelectsThinkingLevel() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-thinking-level-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            await component.onInit();

            const pending = (component as any).handleCommand('/settings');
            await waitForCondition(() => !!component.selectMenu);
            await component.sessionState.confirmSelectMenu('providers');
            await waitForCondition(() => component.selectMenu?.title === 'Settings · Providers');
            await component.sessionState.confirmSelectMenu('thinking-level');
            await waitForCondition(() => component.selectMenu?.title === 'Settings · Thinking Level');
            expect(component.selectMenu?.options.map(option => option.value)).toEqual(['low', 'medium', 'high']);

            await component.sessionState.confirmSelectMenu('high');
            await pending;

            expect((component as any).options.model.reasoningEffort).toEqual('high');
            expect(await store.load(workspace)).toEqual({ thinkingLevel: 'high' });
            expect(component.notice).toContain('Reasoning effort: high');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('health popover toggle collects gateway, mcp and lsp status')
    async healthPopoverCollectsGatewayMcpLspStatus() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.setTools([
            { name: 'mcp.files.read', toolset: 'mcp', active: true },
            { name: 'mcp.files.write', toolset: 'mcp', active: false },
            { name: 'lsp_diagnostics', toolset: 'lsp', active: true }
        ]);

        await (component as any).toggleHealthPopover();

        expect(component.sessionState.healthPopoverVisible).toEqual(true);
        const items = component.sessionState.healthItems;
        expect(items.find(item => item.id === 'gateway')).toEqual({ id: 'gateway', label: 'Gateway', status: 'ok', detail: 'connected' });
        expect(items.find(item => item.id === 'mcp:files')).toEqual({ id: 'mcp:files', label: 'MCP files', status: 'warn', detail: '1/2 tools active' });
        expect(items.find(item => item.id === 'lsp')?.status).toEqual('ok');

        await (component as any).toggleHealthPopover();
        expect(component.sessionState.healthPopoverVisible).toEqual(false);
        expect(component.sessionState.healthItems).toEqual([]);
    }

    @Test('health popover reports local runtime without gateway and no mcp/lsp')
    async healthPopoverReportsLocalRuntime() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await (component as any).toggleHealthPopover();

        const items = component.sessionState.healthItems;
        expect(items.find(item => item.id === 'gateway')).toEqual({ id: 'gateway', label: 'Gateway', status: 'unknown', detail: 'local runtime (no gateway)' });
        expect(items.find(item => item.id === 'mcp')).toEqual({ id: 'mcp', label: 'MCP', status: 'unknown', detail: 'no MCP servers configured' });
        expect(items.find(item => item.id === 'lsp')?.status).toEqual('unknown');
    }

    @Test('health popover keybind ctrl+x h toggles and hover action refreshes')
    async healthPopoverKeybindAndHover() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();
        component.sessionState.setTools([{ name: 'mcp.git.status', toolset: 'mcp', active: true }]);

        await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
        await (component as any).handleTerminalInput({ text: 'h', partial: false }, 'h');
        expect(component.sessionState.healthPopoverVisible).toEqual(true);
        expect(component.sessionState.healthItems.find(item => item.id === 'mcp:git')).toEqual({ id: 'mcp:git', label: 'MCP git', status: 'ok', detail: '1/1 tools active' });

        await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
        await (component as any).handleTerminalInput({ text: 'h', partial: false }, 'h');
        expect(component.sessionState.healthPopoverVisible).toEqual(false);

        expect(component.sessionState.toggleHealthPopoverAction).toBeTruthy();
        await component.sessionState.toggleHealthPopoverAction?.();
        expect(component.sessionState.healthPopoverVisible).toEqual(true);
    }

    @Test('status panel hover calls the health popover action')
    async statusPanelHoverTriggersHealthPopover() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        const panel = new AgentConsoleStatusPanelComponent(component.sessionState);

        expect(component.sessionState.healthPopoverVisible).toEqual(false);
        panel.onHoverEnter();
        await waitForCondition(() => component.sessionState.healthPopoverVisible);
        panel.onHoverLeave();
        expect(component.sessionState.healthPopoverVisible).toEqual(false);
    }

    @Test('display command toggles timestamps and persists the setting')
    async displayCommandTogglesTimestamps() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-display-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            await component.onInit();
            expect(component.sessionState.showTimestamps).toEqual(true);

            await (component as any).handleCommand('/display off');
            expect(component.sessionState.showTimestamps).toEqual(false);
            expect(component.notice).toContain('Hiding message timestamps');
            expect((await store.load(workspace)).showTimestamps).toEqual(false);

            await (component as any).handleCommand('/display');
            expect(component.sessionState.showTimestamps).toEqual(true);
            expect((await store.load(workspace)).showTimestamps).toEqual(true);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('display command critical subcommand toggles critical marking state')
    async displayCommandCriticalMarking() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-display-critical-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            await component.onInit();
            expect(component.sessionState.showCriticalMarks).toEqual(false);

            await (component as any).handleCommand('/display critical');
            expect(component.sessionState.showCriticalMarks).toEqual(true);
            expect(component.notice).toContain('Critical marking enabled');

            await (component as any).handleCommand('/display critical');
            expect(component.sessionState.showCriticalMarks).toEqual(false);
            expect(component.notice).toContain('Critical marking disabled');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('timeline command toggles timeline mode and ctrl+x g maps to it')
    async timelineCommandAndKeybind() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-timeline-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            await component.onInit();
            expect(component.sessionState.timelineMode).toEqual(false);

            await (component as any).handleCommand('/timeline');
            expect(component.sessionState.timelineMode).toEqual(true);
            expect(component.sessionState.timelineViewMode).toEqual('compact');
            expect((await store.load(workspace)).timelineViewMode).toEqual('compact');

            await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
            await (component as any).handleTerminalInput({ text: 'g', partial: false }, 'g');
            expect(component.sessionState.timelineViewMode).toEqual('steps');
            await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
            await (component as any).handleTerminalInput({ text: 'g', partial: false }, 'g');
            expect(component.sessionState.timelineViewMode).toEqual('verbose');
            await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
            await (component as any).handleTerminalInput({ text: 'g', partial: false }, 'g');
            expect(component.sessionState.timelineViewMode).toEqual('off');
            expect(component.sessionState.timelineMode).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('settings general tab toggles tool output and username with persistence')
    async settingsGeneralTabTogglesDisplayOptions() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-display-tabs-'));
        try {
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            (component as any).settingsStore = store;
            await component.onInit();

            const pending = (component as any).handleCommand('/settings');
            await waitForCondition(() => !!component.selectMenu);
            await component.sessionState.confirmSelectMenu('general');
            await waitForCondition(() => component.selectMenu?.title === 'Settings · General');
            expect(component.selectMenu?.options.map(option => option.value)).toContain('tooloutput');
            expect(component.selectMenu?.options.map(option => option.value)).toContain('username');
            expect(component.selectMenu?.options.map(option => option.value)).toContain('timestamps');

            await component.sessionState.confirmSelectMenu('tooloutput');
            await pending;

            expect(component.sessionState.showToolOutput).toEqual(false);
            expect((await store.load(workspace)).showToolOutput).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('restores persisted display toggles on init')
    async consoleRestoresPersistedDisplayToggles() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-display-restore-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { showTimestamps: false, showToolOutput: false, showUsername: true, timelineMode: true });
            const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
            component.configure({ workspace });
            (component as any).settingsStore = store;

            await component.onInit();

            expect(component.sessionState.showTimestamps).toEqual(false);
            expect(component.sessionState.showToolOutput).toEqual(false);
            expect(component.sessionState.showUsername).toEqual(true);
            expect(component.sessionState.timelineMode).toEqual(true);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('terminal leader shortcuts execute commands and ctrl-p opens fuzzy palette')
    async terminalLeaderAndCommandPalette() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        const commands: string[] = [];
        (component as any).handleCommand = async (command: string) => { commands.push(command); return true; };

        await (component as any).handleTerminalInput({ text: '\u0018', partial: false }, '\u0018');
        await (component as any).handleTerminalInput({ text: 's', partial: false }, 's');
        expect(commands).toEqual(['/status']);

        await (component as any).handleTerminalInput({ text: '\u0010', partial: false }, '\u0010');
        expect(component.selectMenu?.title).toEqual('Command palette');
        await (component as any).handleTerminalInput({ text: 's', partial: false }, 's');
        await (component as any).handleTerminalInput({ text: 't', partial: false }, 't');
        await (component as any).handleTerminalInput({ text: 's', partial: false }, 's');
        expect(component.selectMenu?.options.map(option => option.value)).toContain('/status');
        await (component as any).handleTerminalInput({ text: '\u007f', controlKey: 'backspace', partial: false }, '\u007f');
        expect(component.selectMenu?.title).toEqual('Command palette: st');
        await (component as any).handleTerminalInput({ text: 's', partial: false }, 's');
        await component.sessionState.confirmSelectMenu('/status');
        expect(commands).toEqual(['/status', '/status']);
    }

    @Test('keymap command manages persisted global bindings alongside vim bindings')
    async keymapCommandManagesGlobalBindings() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await (component as any).handleCommand('/keymap global set ctrl+g status');
        expect((component as any).globalKeymap.resolve('ctrl+g')).toEqual('status');
        expect(state.notice).toContain('ctrl+g -> status');
        await (component as any).handleCommand('/keymap global unset ctrl+g');
        expect((component as any).globalKeymap.resolve('ctrl+g')).toEqual(undefined);
    }

    @Test('escape interrupts a running turn before vim handling in tui and browser')
    async escapeInterruptsRunningTurnAcrossHosts() {
        const { state, component, sessionService } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        let cancellations = 0;
        (sessionService as any).cancelTurn = async () => { cancellations += 1; return true; };
        await component.onInit();
        state.setVimMode(true);
        state.setStatus('running');

        await (component as any).handleTerminalInput({ text: '\u001b', partial: false }, '\u001b');
        expect(cancellations).toEqual(1);
        expect(state.inputMode).toEqual('insert');

        const panel = new AgentConsoleInputPanelComponent(state);
        await panel.onKeydown({ key: 'Escape', ctrlKey: false, metaKey: false, preventDefault() {} } as KeyboardEvent);
        expect(cancellations).toEqual(2);
    }

    @Test('terminal input intercepts vim normal mode keys before insertion')
    async terminalInputInterceptsVimNormalMode() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.setVimMode(true);
        component.sessionState.setInputMode('normal');
        component.sessionState.setInput('abc');

        await (component as any).handleTerminalInput(
            { text: 'h', partial: false },
            'h'
        );
        expect(component.input).toEqual('abc');
        expect(component.inputCursor).toEqual(2);

        await (component as any).handleTerminalInput(
            { text: '0', partial: false },
            '0'
        );
        expect(component.inputCursor).toEqual(0);

        await (component as any).handleTerminalInput(
            { text: 'x', partial: false },
            'x'
        );
        expect(component.input).toEqual('bc');
        expect(component.inputCursor).toEqual(0);
    }

    @Test('terminal input escape in vim insert mode switches to normal without inserting')
    async terminalInputEscapeSwitchesToNormal() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.setVimMode(true);
        component.sessionState.setInput('draft');
        expect(component.sessionState.inputMode).toEqual('insert');

        await (component as any).handleTerminalInput(
            { text: '\u001b', partial: false },
            '\u001b'
        );
        expect(component.sessionState.inputMode).toEqual('normal');
        expect(component.input).toEqual('draft');

        await (component as any).handleTerminalInput(
            { text: 'd', partial: false },
            'd'
        );
        expect(component.sessionState.vimPendingKey).toEqual('d');
        await (component as any).handleTerminalInput(
            { text: 'd', partial: false },
            'd'
        );
        expect(component.input).toEqual('');
    }

    @Test('terminal input keeps arrow navigation and consumes enter in vim normal mode')
    async terminalInputPreservesArrowsAndConsumesEnter() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        await component.onInit();
        component.sessionState.setVimMode(true);
        component.sessionState.setInputMode('normal');
        component.sessionState.setInput('abc');
        let submitted = false;
        (component as any).submit = async () => {
            submitted = true;
        };

        await (component as any).handleTerminalInput(
            { text: '\u001b[D', controlKey: 'left', partial: false },
            '\u001b[D'
        );
        expect(component.input).toEqual('abc');
        expect(component.inputCursor).toEqual(2);

        await (component as any).handleTerminalInput(
            { text: '\r', controlKey: 'return', partial: false },
            '\r'
        );
        expect(submitted).toEqual(false);
        expect(component.input).toEqual('abc');
    }
}
