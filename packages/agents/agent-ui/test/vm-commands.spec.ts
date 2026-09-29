import { navigationFor } from './test-transcript-navigation';
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
import {TestFileAdapter, AudioCaptureStub, AudioPlaybackStub, RuntimeStub, FailingRuntimeStub, SchedulerStub, ToolRegistryStub, EventMulticasterStub, ApplicationContextStub, AppRpcStub, SessionServiceStub, createDeferred, createConsole, createConsoleParts, InputHistoryStoreStub, ApprovalManagerStub, waitForCondition} from './_helpers';

@Suite('Agent console commands')
export class VmCommandsTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('jobs command opens scheduler dashboard and toggles pause resume')
    async jobsCommandOpensSchedulerDashboardAndTogglesPauseResume() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        scheduler.tasks = [{
            id: 'job-1',
            sessionId: 'console',
            prompt: 'later',
            scheduleType: 'once',
            runAt: Date.now() + 1000,
            nextRunAt: Date.now() + 1000,
            runCount: 0,
            failureCount: 0
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.onInit();

        component.input = '/jobs';
        await component.submit();

        expect(component.sessionState.jobsFocused).toEqual(true);
        expect(component.sessionState.selectedScheduledTaskId).toEqual('job-1');

        await component.sessionState.handleFocusKey('enter', navigationFor(component.sessionState));
        expect(scheduler.paused).toEqual(['job-1']);
        expect(component.sessionState.selectedScheduledTask?.paused).toEqual(true);

        await component.sessionState.handleFocusKey('enter', navigationFor(component.sessionState));
        expect(scheduler.resumed).toEqual(['job-1']);
        expect(component.sessionState.selectedScheduledTask?.paused).toEqual(false);
    }

    @Test('messages command focuses message panel and enter opens detail view')
    async messagesCommandFocusesMessagePanelAndEnterOpensDetailView() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.setMessages([
            { id: 'm1', role: 'user', content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9', createdAt: 1 } as any
        ]);
        component.input = '/messages';
        await component.submit();

        expect(component.sessionState.messagesFocused).toEqual(true);
        expect(component.sessionState.messageDetailOpen).toEqual(false);

        await component.sessionState.handleFocusKey('enter', navigationFor(component.sessionState));
        expect(component.sessionState.messageDetailOpen).toEqual(true);
    }

    @Test('bootstraps session metadata from app rpc state')
    async bootstrapsSessionMetadataFromAppRpcState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.state = {
            sessionId: 'rpc-session',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            modelProfile: 'flash',
            workspace: '/tmp/rpc-workspace',
            title: 'Rpc Console'
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        await component.onInit();

        expect(component.sessionId).toEqual('rpc-session');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/rpc-workspace');
        expect(component.title).toEqual('Rpc Console');
    }

    @Test('plain startup keeps a fresh session empty when the workspace has historical sessions')
    async plainStartupDoesNotRestoreWorkspaceHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const appRpc = new AppRpcStub();
        sessionService.sessions = [{
            id: 'historical-session',
            current: true,
            workspace: '/tmp/history-workspace',
            lastActiveAt: 10
        }];
        appRpc.pageResults = {
            messages: [{ id: 'old-message', role: 'user', content: 'historical transcript', createdAt: 1 }],
            sections: [{ id: 'old-section', label: 'Historical section', createdAt: 1 }],
            goalSummary: { summary: 'historical goal' }
        };
        appRpc.todoPlanBySession.set('historical-session', [{
            id: 'old-plan',
            content: 'historical plan',
            status: 'in_progress'
        }]);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc,
            {
                bootstrapTurn: { enabled: false, sessionId: '' },
                ui: { title: 'Console', console: { workspace: '/tmp/history-workspace' } }
            }
        );

        await component.onInit();

        expect(component.sessionId).toEqual('session-1');
        expect(component.sessionId).not.toEqual('historical-session');
        expect(component.sessionState.messages).toEqual([]);
        expect(component.sessionState.planTodos).toEqual([]);
        expect(component.sessionState.sections).toEqual([]);
        expect(component.sessionState.goalSummary).toEqual(null);
        const todoSessionIds = appRpc.calls
            .filter(call => call.method === 'todo.get')
            .map(call => call.params?.sessionId);
        expect(todoSessionIds).toEqual(['session-1']);
    }

    @Test('workspace-only startup does not restore a sibling session plan')
    async workspaceOnlyStartupDoesNotRestoreSiblingPlan() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const appRpc = new AppRpcStub();
        sessionService.sessions = [{ id: 'historical-session', current: true, workspace: '/tmp/history-workspace' }];
        appRpc.todoPlanBySession.set('historical-session', [{ id: 'old-plan', content: 'old project plan', status: 'in_progress' }]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService, appRpc, {
            ui: { title: 'Console', console: { workspace: '/tmp/history-workspace' } }
        });
        (component as any).bridge.subscribe = () => {
            component.sessionState.setPlanTodos([
                { id: 'replayed-plan', content: 'plan replayed during subscribe', status: 'in_progress' }
            ] as any, 'historical-session', 'project');
        };

        await component.onInit();

        expect(component.sessionId).toEqual('session-1');
        expect(component.sessionState.planTodos).toEqual([]);
        expect(appRpc.calls.filter(call => call.method === 'todo.get').map(call => call.params?.sessionId)).toEqual(['session-1']);

        appRpc.calls.length = 0;
        await (component as any).refreshTurnArtifacts();
        expect(component.sessionState.planTodos).toEqual([]);
        expect(appRpc.calls.filter(call => call.method === 'todo.get').map(call => call.params?.sessionId)).toEqual(['session-1']);
    }

    @Test('explicit startup session still restores its transcript and plan')
    async explicitStartupSessionRestoresHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const appRpc = new AppRpcStub();
        sessionService.sessions = [{ id: 'resume-session', current: true, workspace: '/tmp/history-workspace' }];
        appRpc.pageResults = {
            messages: [{ id: 'resume-message', role: 'user', content: 'resume transcript', createdAt: 1 }]
        };
        appRpc.todoPlanBySession.set('resume-session', [{
            id: 'resume-plan',
            content: 'resume plan',
            status: 'in_progress'
        }]);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc,
            {
                bootstrapTurn: { sessionId: 'resume-session' },
                ui: { title: 'Console', console: { workspace: '/tmp/history-workspace' } }
            }
        );

        await component.onInit();

        expect(component.sessionId).toEqual('resume-session');
        expect(component.sessionState.messages.map(message => message.content)).toContain('resume transcript');
        expect(component.sessionState.planTodos.map(todo => todo.content)).toContain('resume plan');
    }

    @Test('loads persisted input history on init and filters pure commands for selection')
    async loadsPersistedInputHistoryOnInit() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const historyStore = new InputHistoryStoreStub();
        historyStore.setScopedEntries('/tmp/workspace-b', 'chat-a', ['first']);
        historyStore.setScopedEntries('/tmp/workspace-b', 'chat-b', ['second', '/help']);
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-b' } } },
            historyStore
        );

        await component.onInit();

        expect(state.inputHistoryController.entries()).toEqual(['second', 'first']);
        expect(historyStore.workspaces[0]).toEqual('/tmp/workspace-b');
        expect(historyStore.sessionIds[0]).toEqual('');
        state.setInput('draft', 5);
        const inputPanel = new AgentConsoleInputPanelComponent(state);
        const inputField = {
            value: 'draft',
            selectionStart: 5,
            selectionEnd: 5,
            setSelectionRange(start: number, end: number) {
                this.selectionStart = start;
                this.selectionEnd = end;
            },
            focus() {
            }
        } as any;
        let prevented = false;
        await inputPanel.onKeydown({
            key: 'ArrowUp',
            target: inputField,
            preventDefault() {
                prevented = true;
            }
        } as any);
        expect(prevented).toEqual(true);
        expect(state.input).toEqual('second');
        expect(inputField.value).toEqual('second');
        expect(inputField.selectionStart).toEqual('second'.length);
        expect(inputField.selectionEnd).toEqual('second'.length);
        expect(state.inputHistoryController.navigate(-1)).toEqual(true);
        expect(state.input).toEqual('first');
    }

    @Test('terminal arrows browse non-command history from the current directory and restore the draft')
    async terminalArrowsBrowseCurrentDirectoryHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const historyStore = new InputHistoryStoreStub();
        const currentDirectory = process.cwd();
        historyStore.setScopedEntries(currentDirectory, 'chat-a', ['older prompt', '/help']);
        historyStore.setScopedEntries(currentDirectory, 'chat-b', ['newer prompt']);
        historyStore.setScopedEntries('/tmp/another-workspace', 'chat-c', ['other workspace prompt']);
        const { component, state } = createConsoleParts(
            runtime,
            scheduler,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console' } },
            historyStore
        );

        await component.onInit();
        state.setInput('draft text', 'draft text'.length);

        const press = (controlKey: 'up' | 'down') => (component as any).handleTerminalInput(
            { text: controlKey === 'up' ? '\u001b[A' : '\u001b[B', controlKey, partial: false },
            controlKey === 'up' ? '\u001b[A' : '\u001b[B'
        );
        await press('up');
        expect(state.input).toEqual('newer prompt');
        await press('up');
        expect(state.input).toEqual('older prompt');
        await press('down');
        expect(state.input).toEqual('newer prompt');
        await press('down');
        expect(state.input).toEqual('draft text');
        expect(state.inputHistoryController.entries()).not.toContain('/help');
        expect(state.inputHistoryController.entries()).not.toContain('other workspace prompt');
        expect(historyStore.workspaces[0]).toEqual(currentDirectory);
    }

    @Test('input history store aggregates local memory entries across workspace sessions')
    async inputHistoryStoreAggregatesLocalMemoryEntriesAcrossWorkspaceSessions() {
        const ctx = await runAgentUiOrmApp();
        try {
            const store = new AgentConsoleInputHistoryStore(undefined, ctx.get(MemoryStore));
            await store.save(['session-a', '/help'], '/tmp/shared-workspace', 'chat-a');
            await store.save(['session-b', 'session-a'], '/tmp/shared-workspace', 'chat-b');
            expect(await store.load('/tmp/shared-workspace', 'chat-a')).toEqual(['session-b', 'session-a']);
            expect(await store.load('/tmp/shared-workspace', 'chat-b')).toEqual(['session-b', 'session-a']);
            expect(await store.load('/tmp/shared-workspace', 'chat-c')).toEqual(['session-b', 'session-a']);
        } finally {
            await ctx.close();
        }
    }

    @Test('input history store normalizes Windows workspace variants')
    async inputHistoryStoreNormalizesWindowsWorkspaceVariants() {
        const ctx = await runAgentUiOrmApp();
        try {
            const store = new AgentConsoleInputHistoryStore(undefined, ctx.get(MemoryStore));
            await store.save(['dir'], 'C:\\Repo\\Agents\\', 'chat-a');
            expect(await store.load('c:/repo/agents', 'chat-a')).toEqual(['dir']);
        } finally {
            await ctx.close();
        }
    }

    @Test('tracks detailed tool runs and highlights running tool')
    async tracksDetailedToolRuns() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-2' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentToolInvokedEvent(
            this,
            'chat-2',
            'read_file',
            { path: '/tmp/demo.txt' },
            {
                receiptId: 'r1',
                toolCallId: 'c1',
                toolName: 'read_file',
                executionMode: 'sequential',
                status: 'running',
                inputSummary: '{"path":"/tmp/demo.txt"}',
                attemptCount: 1
            }
        ));

        expect(component.highlightedToolRun?.name).toEqual('read_file');
        expect(component.highlightedToolRun?.status).toEqual('running');
        expect(component.highlightedToolRun?.inputSummary).toContain('/tmp/demo.txt');

        await app.eventMulticaster.emit(new AgentToolCompletedEvent(
            this,
            'chat-2',
            'read_file',
            'ok',
            {
                receiptId: 'r1',
                toolCallId: 'c1',
                toolName: 'read_file',
                executionMode: 'sequential',
                status: 'success',
                inputSummary: '{"path":"/tmp/demo.txt"}',
                outputSummary: 'file contents',
                durationMs: 12,
                attemptCount: 1
            }
        ));

        expect(component.highlightedToolRun?.status).toEqual('success');
        expect(component.highlightedToolRun?.outputSummary).toEqual('file contents');

        await app.eventMulticaster.emit(new AgentToolFailedEvent(
            this,
            'chat-2',
            'write_file',
            new Error('permission denied'),
            {
                receiptId: 'r2',
                toolCallId: 'c2',
                toolName: 'write_file',
                executionMode: 'sequential',
                status: 'error',
                inputSummary: '{"path":"/tmp/demo.txt"}',
                error: 'permission denied',
                durationMs: 5,
                attemptCount: 1
            }
        ));

        expect(component.highlightedToolRun?.name).toEqual('write_file');
        expect(component.highlightedToolRun?.error).toEqual('permission denied');
        expect(component.lastError).toEqual('permission denied');
    }

    @Test('compensation events for other sessions are ignored')
    async rollbackActivityIgnoredForOtherSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-rollback' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentCompensationEvent(
            this,
            'other-session',
            'error',
            3,
            ['tc-x']
        ));

        expect(component.activities.some(activity => activity.kind === 'rollback')).toEqual(false);
    }

    @Test('shared console component projects session state')
    async sharedConsoleComponentProjectsSessionState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub());
        component.configure({ provider: 'deepseek', model: 'deepseek-v4-flash', workspace: '/tmp/workspace' });
        await component.onInit();
        state.setSessions([{ id: 'chat-1', current: true, messageCount: 1, updatedAt: 1 }]);

        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/workspace');
        expect(state.sessions.length).toEqual(1);
        expect(state.selectedSessionId).toEqual('chat-1');
        expect(component.tools.length).toEqual(1);
        expect(component.messages.length).toBeGreaterThan(0);
        expect(component.activities.length).toEqual(0);
        expect(component.notice).toEqual('');
        expect(component.selectMenu).toEqual(undefined);

        state.setNotice('Switch model');
        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek', description: 'default fast profile', detail: 'DeepSeek provider\nModel: deepseek-v4-flash' },
            { label: 'OpenAI', value: 'openai', description: 'gpt family', detail: 'OpenAI provider\nModel: gpt-4o-mini' }
        ], 1);
        expect(component.notice).toEqual('Switch model');
        expect(component.selectMenu?.selectedIndex).toEqual(1);
        expect(component.selectMenu?.options[1].detail).toContain('OpenAI provider');
        state.moveSelectMenu(1);
        expect(component.selectMenu?.selectedIndex).toEqual(0);
        expect(state.selectedSelectMenuOption?.value).toEqual('deepseek');

        component.input = 'hello panel';
        await component.submit();

        expect(component.messages[component.messages.length - 1].content).toEqual('Echo: hello panel');
        expect(component.input).toEqual('');
        expect(component.highlightedToolRun).toEqual(undefined);
    }

    @Test('shared select menu actions resolve, choose, and cancel through session state')
    async sharedSelectMenuActionsResolveThroughSessionState() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const resolved: Array<string | undefined> = [];

        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);
        state.selectMenuAction = (value) => {
            resolved.push(value);
        };

        await state.chooseSelectMenuIndex(1);
        expect(resolved).toEqual(['openai']);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);
        state.selectMenuAction = (value) => {
            resolved.push(value);
        };

        state.moveSelectMenu(1);
        await state.confirmSelectMenu();
        expect(resolved).toEqual(['openai', 'openai']);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);
        state.selectMenuAction = (value) => {
            resolved.push(value);
        };

        await state.cancelSelectMenu();
        expect(resolved).toEqual(['openai', 'openai', undefined]);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('approvals command focuses pending requests instead of opening modal')
    async approvalsCommandFocusesPendingRequests() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const approvals = new ApprovalManagerStub();
        approvals.pending = [{
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000,
            expiresAt: Date.now() + 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, approvals);

        component.input = '/approvals';
        await component.submit();

        expect(component.sessionState.approvalsFocused).toEqual(true);
        expect(component.sessionState.selectedApproval?.id).toEqual('approval-1');
        expect(approvals.approved).toEqual([]);
    }

    @Test('tools command focuses tool panel instead of opening modal')
    async toolsCommandFocusesToolPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.onInit();

        component.input = '/tools';
        await component.submit();

        expect(component.sessionState.toolsFocused).toEqual(true);
        expect(component.sessionState.selectedTool?.name).toEqual('read_file');
    }

    @Test('tools command activates a named tool')
    async toolsCommandActivatesNamedTool() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const toolRegistry = new ToolRegistryStub();
        const component = createConsole(runtime, scheduler, toolRegistry);
        await component.onInit();

        component.input = '/tools read_file';
        await component.submit();

        expect(toolRegistry.activations).toEqual([{ sessionId: 'console', name: 'read_file' }]);
        expect(component.notice).toEqual('Activated read_file.');
    }

    @Test('help command uses action hint in select menu')
    async helpCommandUsesActionHintInSelectMenu() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.onInit();

        component.input = '/help';
        const pending = component.submit();
        await waitForCondition(() => !!component.sessionState.selectMenu);

        expect(component.sessionState.selectMenu?.title).toEqual('Help');
        expect(component.sessionState.selectMenu?.hint).toEqual(component.sessionState.consoleOptions.selectHint);

        await component.sessionState.cancelSelectMenu();
        await pending;
    }

    @Test('exit command closes application')
    async exitCommandClosesApplication() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), app);

        await component.onInit();
        component.input = '/exit';
        await component.submit();

        expect(app.closeCalls).toEqual(1);
        expect(component.notice).toEqual('');
    }

    @Test('component handleCommand returns true for known commands')
    async componentHandleCommandReturnsTrue() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([]);
        expect(state.messages.length).toEqual(0);
    }

    @Test('escape dismisses focused layers back to input focus')
    async escapeDismissesFocusedLayersBackToInputFocus() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setMessages([
            { id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any
        ]);
        navigationFor(state).setFocused(true);
        state.openMessageDetail();

        expect(state.inputFocused).toEqual(false);

        await state.focusController.dismiss(navigationFor(state));
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messagesFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);

        state.openSelectMenu('Help', [{ label: '/help', value: '/help' }], 0);
        expect(state.inputFocused).toEqual(false);

        await state.focusController.dismiss(navigationFor(state));
        expect(state.selectMenu).toEqual(undefined);
        expect(state.inputFocused).toEqual(true);

        state.setPendingApprovals([{
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'console',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval.',
            hasInput: true,
            createdAt: 1,
            timeoutMs: 30000
        } as any]);
        state.setApprovalsFocused(true);
        expect(state.inputFocused).toEqual(false);

        await state.focusController.dismiss(navigationFor(state));
        expect(state.approvalsFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);
    }

    @Test('resolveThreadSessionsFor groups sessions by primaryThreadId and originThreadId lineage')
    async resolveThreadSessionsForGroupsByPrimaryThreadIdAndOriginThreadIdLineage() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, new AppRpcStub());

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, primaryThreadId: 'thread-1' } as any,
            { id: 'worker-b', current: false, updatedAt: 20, originThreadId: 'thread-1' } as any,
            { id: 'worker-c', current: false, updatedAt: 5, originThreadId: 'worker-b' } as any,
            { id: 'other-d', current: false, updatedAt: 30, primaryThreadId: 'thread-2' } as any
        ]);

        const threadSessions = (component as any).resolveThreadSessionsFor('chat-a');
        expect(threadSessions.map((item: any) => item.id).sort()).toEqual(['chat-a', 'worker-b', 'worker-c']);
        expect((component as any).resolveThreadSessionIdsFor('chat-a').sort()).toEqual(['chat-a', 'worker-b', 'worker-c']);
    }

    @Test('resolveThreadSessionsFor falls back to the anchor session when no thread lineage exists')
    async resolveThreadSessionsForFallsBackToAnchorSession() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, new AppRpcStub());

        component.sessionState.configure({ sessionId: 'solo-a' });
        component.sessionState.setSessions([
            { id: 'solo-a', current: true, updatedAt: 10, workspace: '/tmp/x' } as any,
            { id: 'solo-b', current: false, updatedAt: 20, workspace: '/tmp/x' } as any
        ]);

        const threadSessions = (component as any).resolveThreadSessionsFor('solo-a');
        expect(threadSessions.map((item: any) => item.id)).toEqual(['solo-a']);
    }

    @Test('refreshThreadTodoPlan merges thread-scoped plan todos and marks thread scope')
    async refreshThreadTodoPlanMergesThreadScopedTodosAndMarksThreadScope() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.todoPlanBySession.set('chat-a', [{ id: 'todo-a', content: 'thread root todo', status: 'completed' }]);
        appRpc.todoPlanBySession.set('worker-b', [{ id: 'todo-b', content: 'worker active todo', status: 'in_progress' }]);
        appRpc.todoPlanBySession.set('worker-c', [
            { id: 'todo-a', content: 'duplicate todo id', status: 'pending' },
            { id: 'todo-c', content: 'worker c todo', status: 'pending' }
        ]);
        appRpc.todoPlanBySession.set('other-d', [{ id: 'todo-d', content: 'other thread todo', status: 'in_progress' }]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);

        component.sessionState.configure({ sessionId: 'chat-a' });
        component.sessionState.setSessions([
            { id: 'chat-a', current: true, updatedAt: 10, primaryThreadId: 'thread-1' } as any,
            { id: 'worker-b', current: false, updatedAt: 20, originThreadId: 'thread-1' } as any,
            { id: 'worker-c', current: false, updatedAt: 5, originThreadId: 'worker-b' } as any,
            { id: 'other-d', current: false, updatedAt: 30, primaryThreadId: 'thread-2' } as any
        ]);

        await (component as any).refreshThreadTodoPlan();

        // active-only projection: completed root todo excluded; duplicate id deduped; other thread excluded
        expect(component.sessionState.planTodos.map(item => item.id)).toEqual(['todo-b', 'todo-c']);
        expect(component.sessionState.planTodos.some(item => item.id === 'todo-d')).toEqual(false);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('worker-b');
        expect(component.sessionState.planScope).toEqual('thread');
        const todoGetSessionIds = appRpc.calls
            .filter(call => call.method === 'todo.get')
            .map(call => String(call.params?.sessionId || ''))
            .sort();
        expect(todoGetSessionIds).toEqual(['chat-a', 'worker-b', 'worker-c']);

        // project-scoped refresh flips the scope marker back
        await (component as any).refreshTodoPlan();
        expect(component.sessionState.planScope).toEqual('project');
    }

    @Test('session state copies selected message content when messages are focused')
    async sessionStateCopiesSelectedMessageContentWhenMessagesFocused() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const copied: Array<{ text: string; label: string }> = [];
        state.copyFocusedTextAction = async (text, label) => {
            copied.push({ text, label });
        };
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2',
                createdAt: 1
            } as any
        ]);

        navigationFor(state).setFocused(true);
        expect(await state.handleFocusKey('copy', navigationFor(state))).toEqual(true);
        expect(copied).toEqual([{ text: 'line1\nline2', label: 'selected message' }]);
    }

    @Test('session state copies selected message content from message detail')
    async sessionStateCopiesSelectedMessageContentFromMessageDetail() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const copied: Array<{ text: string; label: string }> = [];
        state.copyFocusedTextAction = async (text, label) => {
            copied.push({ text, label });
        };
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2\nline3',
                createdAt: 1
            } as any
        ]);

        navigationFor(state).setFocused(true);
        state.openMessageDetail();
        expect(await state.handleFocusKey('copy', navigationFor(state))).toEqual(true);
        expect(copied).toEqual([{ text: 'line1\nline2\nline3', label: 'selected message' }]);
    }

    @Test('plan command toggles read-only plan mode through the local runtime')
    async planCommandTogglesLocalPlanMode() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'pm-1';

        await (component as any).handleCommand('/plan');
        expect(state.planMode).toEqual(true);
        expect(runtime.planModeSessions.has('pm-1')).toEqual(true);
        expect(state.notice).toContain('Plan mode enabled');

        await (component as any).handleCommand('/plan');
        expect(state.planMode).toEqual(false);
        expect(runtime.planModeSessions.has('pm-1')).toEqual(false);
        expect(state.notice).toContain('Plan mode disabled');
    }

    @Test('plan command accepts explicit on/off arguments')
    async planCommandAcceptsExplicitArgs() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'pm-2';

        await (component as any).handleCommand('/plan on');
        expect(state.planMode).toEqual(true);

        await (component as any).handleCommand('/plan off');
        expect(state.planMode).toEqual(false);

        await (component as any).handleCommand('/plan true');
        expect(state.planMode).toEqual(true);
    }

    @Test('plan command routes through app rpc when remote')
    async planCommandRoutesThroughAppRpc() {
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'pm-3';

        await (component as any).handleCommand('/plan');
        const call = appRpc.calls.find(c => c.method === 'session.plan_mode.set');
        expect(call).toBeTruthy();
        expect((call as any).params).toEqual({ sessionId: 'pm-3', enabled: true });
        expect(state.planMode).toEqual(true);
    }

    @Test('permissions command sets session sandbox mode locally')
    async permissionsCommandSetsLocalSandboxMode() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'pm-4';

        await (component as any).handleCommand('/permissions sandbox workspace');
        expect(runtime.sandboxModes.get('pm-4')).toEqual('workspace');
        expect(state.notice).toContain('Sandbox mode set to workspace');

        await (component as any).handleCommand('/permissions sandbox default');
        expect(runtime.sandboxModes.has('pm-4')).toEqual(false);
        expect(state.notice).toContain('Sandbox mode set to default');
    }

    @Test('permissions command routes sandbox mode through app rpc when remote')
    async permissionsCommandRoutesSandboxModeThroughRpc() {
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'pm-5';

        await (component as any).handleCommand('/permissions sandbox network-block');
        const call = appRpc.calls.find(c => c.method === 'session.sandbox_mode.set');
        expect(call).toBeTruthy();
        expect((call as any).params).toEqual({ sessionId: 'pm-5', mode: 'network-block' });
        expect(state.notice).toContain('Sandbox mode set to network-block');
    }

    @Test('delegation mode command shows the current mode with no arguments')
    async delegationModeCommandShowsCurrentMode() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'dl-1';
        runtime.setSessionDelegationMode('dl-1', 'proactive');

        await (component as any).handleCommand('/delegation mode');

        expect(state.notice).toContain('Delegation mode: proactive');
        expect(state.notice).toContain('disabled');
        expect(state.notice).toContain('explicit');
        expect(state.notice).toContain('proactive');
    }

    @Test('delegation mode command sets the mode locally')
    async delegationModeCommandSetsLocally() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'dl-2';

        await (component as any).handleCommand('/delegation mode disabled');
        expect(runtime.delegationModes.get('dl-2')).toEqual('disabled');
        expect(state.notice).toContain('"disabled"');

        await (component as any).handleCommand('/delegation mode default');
        expect(runtime.delegationModes.has('dl-2')).toEqual(false);
        expect(state.notice).toContain('configured default');
    }

    @Test('delegation mode command rejects unknown modes')
    async delegationModeCommandRejectsUnknown() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'dl-3';

        await (component as any).handleCommand('/delegation mode aggressive');

        expect(state.notice).toContain('Invalid delegation mode');
        expect(runtime.delegationModes.has('dl-3')).toEqual(false);
    }

    @Test('delegation mode command routes through app rpc when remote')
    async delegationModeCommandRoutesThroughRpc() {
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'dl-4';

        await (component as any).handleCommand('/delegation mode proactive');
        const call = appRpc.calls.find(c => c.method === 'session.delegation_mode.set');
        expect(call).toBeTruthy();
        expect((call as any).params).toEqual({ sessionId: 'dl-4', mode: 'proactive' });
        expect(state.notice).toContain('"proactive"');

        await (component as any).handleCommand('/delegation mode default');
        const reset = appRpc.calls.find(c => c.method === 'session.delegation_mode.set' && (c as any).params.mode === 'default');
        expect(reset).toBeTruthy();
        expect(state.notice).toContain('configured default');
    }

    @Test('goal command creates and shows a local persistent goal')
    async goalCommandCreatesAndShowsLocalGoal() {
        const runtime = new RuntimeStub() as any;
        const goals = new Map<string, any>();
        runtime.createGoal = async (input: any) => { const goal = { id: 'g1', status: 'active', ...input }; goals.set('g1', goal); return goal; };
        runtime.getSessionGoal = async () => goals.get('g1');
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'goal-session';
        await (component as any).handleCommand('/goal create Release | Ship version 1 | tests pass; build clean');
        expect(state.notice).toContain('Goal g1 created');
        await (component as any).handleCommand('/goal show');
        expect(state.notice).toContain('tests pass');
    }

    @Test('goal command routes creation through app rpc')
    async goalCommandRoutesThroughRpc() {
        const appRpc = new AppRpcStub();
        (appRpc as any).request = async function(method: string, params: any) { this.calls.push({ method, params }); return { id: 'g2', title: params.title, status: 'active' }; };
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'goal-rpc';
        await (component as any).handleCommand('/goal create Release | Ship it | tests pass');
        expect(appRpc.calls.find(call => call.method === 'goal.create')?.params.sessionId).toEqual('goal-rpc');
    }

    @Test('session opening tolerates unavailable goal lookup')
    async sessionOpeningToleratesUnavailableGoalLookup() {
        const runtime = new RuntimeStub() as any;
        runtime.getSessionGoal = async () => { throw new Error('unsupported'); };
        const { component } = createConsoleParts(runtime, new SchedulerStub());
        await expect((component as any).openSession('goal-optional')).resolves.toBeUndefined();
    }

    @Test('session page carries goal summary without a second goal request')
    async sessionPageCarriesGoalSummary() {
        const runtime = new RuntimeStub() as any;
        runtime.getSessionGoal = async () => ({ id: 'g1', title: 'Release', successCriteria: ['tests pass'], status: 'active' });
        const service = new AgentConsoleSessionService(undefined, undefined, runtime);
        const page = await service.loadMessagesPage('goal-batch');
        expect(page.goalSummary?.id).toEqual('g1');
    }

    @Test('plan nudge is hidden in plan mode and when disabled')
    async planNudgeRespectsModeAndConfiguration() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setInput('Plan the implementation carefully before making edits.');
        expect(state.planNudgeLabel).toContain('/plan');

        state.setPlanMode(true);
        expect(state.planNudgeLabel).toEqual('');

        state.setPlanMode(false);
        state.setPlanNudgesEnabled(false);
        expect(state.planNudgeLabel).toEqual('');
    }

    @Test('undo command reverts the last file change through the local runtime')
    async undoCommandRevertsFileChange() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'uf-1';

        await (component as any).handleCommand('/undo');

        expect(runtime.calls).toContain('undo:file');
        expect(state.notice).toContain('/ws/a.txt');
        expect(state.notice).toContain('content');
    }

    @Test('redo command re-applies the last undone change through app rpc when remote')
    async redoCommandRoutesThroughAppRpc() {
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'uf-2';

        await (component as any).handleCommand('/redo');

        const call = appRpc.calls.find(c => c.method === 'session.redo_file');
        expect(call).toBeTruthy();
        expect((call as any).params).toEqual({ sessionId: 'uf-2' });
        expect(state.notice).toContain('Nothing');
    }

    @Test('export command writes session transcript to workspace through file adapter')
    async exportCommandWritesSessionTranscript() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-export-'));
        try {
            const app = new ApplicationContextStub();
            app.registry.set(FileAdapter, new TestFileAdapter());
            const runtime = new RuntimeStub();
            const appRpc = new AppRpcStub();
            appRpc.sessionExports.set('exp-1:jsonl', {
                sessionId: 'exp-1',
                format: 'jsonl',
                exportedAt: 1,
                fileName: 'session-exp-1.jsonl',
                contentType: 'application/x-ndjson; charset=utf-8',
                content: `${JSON.stringify({ type: 'session', exportedAt: 1, session: { id: 'exp-1', messageCount: 1, toolCallCount: 1 } })}\n${JSON.stringify({ type: 'message', message: { id: 'm1', role: 'assistant', content: 'ready', createdAt: 1, metadata: { toolCalls: [{ id: 'tc-1', name: 'read_file', input: { path: 'README.md' } }] } } })}\n${JSON.stringify({ type: 'tool_call', toolCall: { id: 'tc-1', name: 'read_file', input: { path: 'README.md' }, messageId: 'm1', createdAt: 1 } })}\n`,
                session: { id: 'exp-1', messageCount: 1, toolCallCount: 1 },
                messages: [{ id: 'm1', role: 'assistant', content: 'ready', createdAt: 1, metadata: { toolCalls: [{ id: 'tc-1', name: 'read_file', input: { path: 'README.md' } }] } }],
                toolCalls: [{ id: 'tc-1', name: 'read_file', input: { path: 'README.md' }, messageId: 'm1', createdAt: 1 }]
            });
            const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, app, undefined, undefined, undefined, appRpc);
            state.sessionId = 'exp-1';
            state.setWorkspace(workspace);

            await (component as any).handleCommand('/export jsonl');

            const call = appRpc.calls.find(c => c.method === 'session.export');
            expect(call).toBeTruthy();
            expect((call as any).params).toEqual({ sessionId: 'exp-1', format: 'jsonl' });
            const exportedFile = path.join(workspace, '.tsdi-agent', 'exports', 'session-exp-1.jsonl');
            expect(fs.existsSync(exportedFile)).toEqual(true);
            const content = fs.readFileSync(exportedFile, 'utf8');
            expect(content).toContain('"type":"tool_call"');
            expect(state.notice).toContain(exportedFile);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('export command falls back to preview when no writable file adapter is available')
    async exportCommandFallsBackToPreview() {
        const appRpc = new AppRpcStub();
        appRpc.sessionExports.set('exp-2', {
            sessionId: 'exp-2',
            format: 'json',
            exportedAt: 1,
            fileName: 'session-exp-2.json',
            contentType: 'application/json; charset=utf-8',
            content: JSON.stringify({
                type: 'session_export',
                format: 'json',
                exportedAt: 1,
                session: { id: 'exp-2', messageCount: 1, toolCallCount: 0 },
                messages: [{ id: 'm1', role: 'assistant', content: 'ready', createdAt: 1 }],
                toolCalls: []
            }, null, 2),
            session: { id: 'exp-2', messageCount: 1, toolCallCount: 0 },
            messages: [{ id: 'm1', role: 'assistant', content: 'ready', createdAt: 1 }],
            toolCalls: []
        });
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub(), undefined, undefined, undefined, undefined, undefined, appRpc);
        state.sessionId = 'exp-2';

        await (component as any).handleCommand('/export');

        const call = appRpc.calls.find(c => c.method === 'session.export');
        expect(call).toBeTruthy();
        expect((call as any).params).toEqual({ sessionId: 'exp-2', format: 'json' });
        expect(state.notice).toContain('Export preview ready');
        expect(state.selectMenu?.title).toEqual('Session export (json)');
        expect(state.selectMenu?.options[0].detail).toContain('"type": "session_export"');
    }

    @Test('undo command reports nothing when the runtime has no snapshots')
    async undoCommandReportsNothing() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(runtime, new SchedulerStub());
        state.sessionId = 'uf-3';
        runtime.undoFileChange = async () => ({ filePath: '', restored: 'none' });

        await (component as any).handleCommand('/undo');

        expect(state.notice).toEqual('Nothing to undo.');
    }

    @Test('share command creates a share through rpc and opens the share panel')
    async shareCommandCreatesShareViaRpc() {
        const appRpc = new AppRpcStub();
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        const pending = (component as any).handleCommand('/share');
        await waitForCondition(() => !!component.selectMenu);
        expect(component.selectMenu?.title).toEqual('Session share');
        expect(component.selectMenu?.options.some(option => option.value === 'copy')).toEqual(true);
        expect(component.selectMenu?.options.some(option => option.label.includes('/api/share/'))).toEqual(true);

        await component.sessionState.cancelSelectMenu();
        await pending;
        expect(appRpc.calls.some(call => call.method === 'session.share.create')).toEqual(true);
    }

    @Test('share command notifies when the gateway is unavailable')
    async shareCommandNotifiesWithoutGateway() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await (component as any).handleCommand('/share');
        expect(component.notice).toContain('requires a gateway');
    }

    @Test('unshare command revokes a share by token and lists shares without args')
    async unshareCommandRevokesShare() {
        const appRpc = new AppRpcStub();
        appRpc.shareTokens.push('tok_revoke1');
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        await (component as any).handleCommand('/unshare tok_revoke1');
        expect(component.notice).toContain('revoked');
        expect(appRpc.calls.some(call => call.method === 'session.share.revoke' && call.params?.token === 'tok_revoke1')).toEqual(true);
        expect(appRpc.shareTokens).toEqual([]);
    }

    @Test('unshare without args lists active shares for selection')
    async unshareCommandListsShares() {
        const appRpc = new AppRpcStub();
        appRpc.shareTokens.push('tok_abc');
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        const pending = (component as any).handleCommand('/unshare');
        await waitForCondition(() => !!component.selectMenu);
        expect(component.selectMenu?.title).toEqual('Active shares');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['tok_abc']);

        await component.sessionState.confirmSelectMenu('tok_abc');
        await pending;
        expect(component.notice).toContain('revoked');
        expect(appRpc.calls.some(call => call.method === 'session.share.revoke' && call.params?.token === 'tok_abc')).toEqual(true);
        expect(appRpc.shareTokens).toEqual([]);
    }

    @Test('skills command lists skills and opens a detail selector')
    async skillsCommandListsSkills() {
        const toolRegistry = new ToolRegistryStub();
        toolRegistry.skills = [
            { id: 'patch-handlers', title: 'Patch handlers', summary: 'Apply targeted patches', category: 'engineering', source: 'local' },
            { id: 'review-checklist', title: 'Review checklist', summary: 'Run review checks', category: 'qa', source: 'remote' }
        ];
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), toolRegistry);
        await component.onInit();

        const pending = (component as any).handleCommand('/skills');
        await waitForCondition(() => !!component.selectMenu);
        expect(component.selectMenu?.title).toEqual('Skills');
        expect(component.selectMenu?.options.map(option => option.value)).toEqual(['patch-handlers', 'review-checklist']);

        await component.sessionState.confirmSelectMenu('patch-handlers');
        await pending;
        expect(component.notice).toContain('Skill: patch-handlers');
    }

    @Test('skills command filters by query and reports no matches')
    async skillsCommandFiltersByQuery() {
        const toolRegistry = new ToolRegistryStub();
        toolRegistry.skills = [{ id: 'patch-handlers', title: 'Patch handlers', summary: 'Apply patches' }];
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), toolRegistry);
        await component.onInit();

        await (component as any).handleCommand('/skills patch');
        expect(component.notice).toContain('patch-handlers');

        await (component as any).handleCommand('/skills nomatch');
        expect(component.notice).toContain('No skills match');
    }

    @Test('mcp command lists servers with tool counts and verbose shows tools')
    async mcpCommandListsServers() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        component.sessionState.setTools([
            { name: 'mcp.files.read', toolset: 'mcp', active: true },
            { name: 'mcp.files.write', toolset: 'mcp', active: false },
            { name: 'mcp.git.status', toolset: 'mcp', active: true },
            { name: 'read_file', toolset: 'filesystem', active: true }
        ]);

        await (component as any).handleCommand('/mcp');
        expect(component.notice).toContain('files · 1/2 tools active');
        expect(component.notice).toContain('git · 1/1 tools active');
        expect(component.notice).not.toContain('read_file');

        await (component as any).handleCommand('/mcp verbose');
        expect(component.notice).toContain('mcp.files.read');
        expect(component.notice).toContain('mcp.git.status');
    }

    @Test('mcp command reports when no servers are configured')
    async mcpCommandReportsNone() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await (component as any).handleCommand('/mcp');
        expect(component.notice).toContain('No MCP servers configured');
    }

    @Test('plugins command lists plugins and shows detail for a specific one')
    async pluginsCommandListsPlugins() {
        const toolRegistry = new ToolRegistryStub();
        toolRegistry.plugins = [
            { id: 'gh-connector', manifest: { name: 'GitHub Connector', description: 'GitHub integration' }, scope: 'workspace' }
        ];
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), toolRegistry);
        await component.onInit();

        await (component as any).handleCommand('/plugins');
        expect(component.notice).toContain('GitHub Connector');
        expect(component.notice).toContain('[workspace]');

        await (component as any).handleCommand('/plugins gh-connector');
        expect(component.notice).toContain('Plugin: GitHub Connector');
        expect(component.notice).toContain('Id: gh-connector');
    }

    @Test('apps command browses connectors with authorization status')
    async appsCommandBrowsesConnectors() {
        const component = createConsole(
            new RuntimeStub(),
            new SchedulerStub(),
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', console: { connectors: { github: true } } } }
        );
        await component.onInit();

        const pending = (component as any).handleCommand('/apps');
        await waitForCondition(() => !!component.selectMenu);
        expect(component.selectMenu?.title).toEqual('Apps');
        expect(component.selectMenu?.options.find(option => option.value === 'github')?.label).toContain('connected');
        expect(component.selectMenu?.options.find(option => option.value === 'slack')?.label).toContain('authorization required');
        await component.sessionState.confirmSelectMenu(undefined);
        await pending;
    }

    @Test('apps command inserts a connector mention into the current draft')
    async appsCommandInsertsConnectorMention() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        component.sessionState.setInput('Summarize open issues');

        await (component as any).handleCommand('/apps github');
        expect(component.input).toEqual('Summarize open issues $github ');
        expect(component.notice).toContain('GitHub connector inserted');

        await (component as any).handleCommand('/apps unknown');
        expect(component.input).toEqual('Summarize open issues $github ');
        expect(component.notice).toContain('Unknown connector');
    }

    @Test('apps command delegates connector authorization to the host')
    async appsCommandAuthorizesThroughHost() {
        let authorized = '';
        const component = createConsole(
            new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(),
            undefined, undefined, undefined, undefined, undefined,
            { ui: { title: 'Console', console: { connectors: {} }, authorizeConnector: async (app: any) => { authorized = app.id; return true; } } }
        );
        await component.onInit();

        await (component as any).handleCommand('/apps github');
        expect(authorized).toEqual('github');
        expect(component.input).toEqual('$github ');
        expect(component.notice).toContain('connector inserted');
    }

    @Test('apps command reports cancelled host authorization without inserting')
    async appsCommandAuthorizationCancelled() {
        const component = createConsole(
            new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(),
            undefined, undefined, undefined, undefined, undefined,
            { ui: { title: 'Console', console: { connectors: {} }, authorizeConnector: () => false } }
        );
        await component.onInit();

        await (component as any).handleCommand('/apps github');
        expect(component.input).toEqual('');
        expect(component.notice).toContain('cancelled');
    }

    @Test('app mentions enrich the prompt with connector status and capabilities')
    async appMentionsEnrichPromptContext() {
        const component = createConsole(
            new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub(),
            undefined, undefined, undefined, undefined, undefined,
            { ui: { title: 'Console', console: { connectors: { gitlab: { authorized: true } } } } }
        );

        const prompt = await (component as any).enrichPromptWithMentions('Review $gitlab merge requests and $unknown data');
        expect(prompt).toContain('Connector GitLab: id=gitlab, status=connected');
        expect(prompt).toContain('Review $gitlab merge requests and $unknown data');
        expect(prompt).not.toContain('Connector unknown');
    }
}
