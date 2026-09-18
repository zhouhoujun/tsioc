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
import {TestFileAdapter, AudioCaptureStub, AudioPlaybackStub, RuntimeStub, FailingRuntimeStub, SchedulerStub, ToolRegistryStub, EventMulticasterStub, ApplicationContextStub, AppRpcStub, SessionServiceStub, createDeferred, createConsole, createConsoleParts, InputHistoryStoreStub, ApprovalManagerStub, createWorkspaceFixture, createWorkspaceMentionsProvider, waitForSuggestionMenu} from './_helpers';

@Suite('Agent console mentions/session-state')
export class VmMentionsTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('session state resolves slash and mention suggestions from input cursor')
    async sessionStateResolvesSlashAndMentionSuggestions() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setCommandHints(['/help', '/hello']);
        state.setTools([
            { name: 'read_file', active: false },
            { name: 'write_file', active: false }
        ]);

        state.setInput('/');
        expect(state.selectMenu?.title).toEqual('Suggestions');
        const slashValues = state.selectMenu?.options.map(option => option.value) ?? [];
        expect(slashValues).toContain('/help');
        expect(slashValues).toContain('/hello');

        await state.confirmSelectMenu('/hello');
        expect(state.input).toEqual('/hello ');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('check @wo', 'check @wo'.length);
        expect(state.selectMenu?.title).toEqual('Suggestions');
        expect(state.selectMenu?.options.map(option => option.value)).toContain('@workspace');

        await state.confirmSelectMenu('@workspace');
        expect(state.input).toEqual('check @workspace ');
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('session state resolves workspace file and folder suggestions from mention input')
    async sessionStateResolvesWorkspaceMentionSuggestions() {
        const workspace = createWorkspaceFixture();
        try {
            const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
            state.setWorkspace(workspace);
            state.setWorkspaceMentionResolver(createWorkspaceMentionsProvider());

            state.setInput('check @sr', 'check @sr'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.title).toEqual('Suggestions');
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@src/');

            state.setInput('check @src/in', 'check @src/in'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@src/index.ts');

            state.setInput('check @guides/in', 'check @guides/in'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@docs/guides/intro.md');

            state.setInput('check @int', 'check @int'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@docs/guides/intro.md');

            state.setInput('check @文件', 'check @文件'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.options.map(option => option.value)).toContain('@docs/references/引用文件.md');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('session state groups skill and plugin mentions with canonical insertion values')
    async sessionStateGroupsSkillAndPluginMentions() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setWorkspaceMentionResolver(new AgentConsoleWorkspaceMentionsProvider());
        state.setMentionCatalog([
            { kind: 'skill', id: 'implement', title: 'Implement', description: 'Make code changes' },
            { kind: 'plugin', id: 'com.example.review', title: 'Review plugin', scope: 'workspace' }
        ]);

        state.setInput('use @skill:im');
        await waitForSuggestionMenu(state);
        expect(state.selectMenu?.options).toContainEqual(expect.objectContaining({
            value: '@skill:implement',
            description: 'Skill / Make code changes'
        }));

        state.setInput('use @plugin:com');
        await waitForSuggestionMenu(state);
        expect(state.selectMenu?.options).toContainEqual(expect.objectContaining({
            value: '@plugin:com.example.review',
            description: 'Plugin / workspace'
        }));
    }

    @Test('component resolves workspace mention suggestions from app file adapter fallback')
    async componentResolvesWorkspaceMentionSuggestionsFromAppFileAdapter() {
        const workspace = createWorkspaceFixture();
        try {
            const runtime = new RuntimeStub();
            const scheduler = new SchedulerStub();
            const app = new ApplicationContextStub();
            app.registry.set(FileAdapter, new TestFileAdapter());
            const { component } = createConsoleParts(
                runtime,
                scheduler,
                new ToolRegistryStub(),
                app,
                undefined,
                new AgentConsoleWorkspaceMentionsProvider()
            );
            component.configure({
                sessionId: 'chat-app-workspace-mentions',
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                workspace
            });

            await component.onInit();

            component.sessionState.setInput('check @src/in', 'check @src/in'.length);
            await waitForSuggestionMenu(component.sessionState);

            expect(component.selectMenu?.options.map(option => option.value)).toContain('@src/index.ts');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('session state processes raw enter chunks through shared console input rules')
    async sessionStateProcessesRawEnterChunks() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        let submitCount = 0;
        state.submitAction = async () => {
            submitCount += 1;
        };

        state.setCommandHints(['/help']);
        state.setTools([{ name: 'read_file', active: false } as any]);
        state.setInput('/he');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        const confirmed = await state.processRawChunk('\r', { submitOnEnter: true, hasSelectMenu: true });
        expect(confirmed.confirmedSelection).toEqual(true);
        expect(confirmed.submitted).toEqual(true);
        expect(state.input).toEqual('/help ');
        expect(submitCount).toEqual(1);

        state.setInput('hello');
        const submitted = await state.processRawChunk('\r', { submitOnEnter: true });
        expect(submitted.confirmedSelection).toEqual(false);
        expect(submitted.submitted).toEqual(true);
        expect(submitCount).toEqual(2);

        state.setInput('check @re');
        const mentioned = await state.processRawChunk('\r', { submitOnEnter: true, hasSelectMenu: true });
        expect(mentioned.confirmedSelection).toEqual(true);
        expect(mentioned.submitted).toEqual(true);
        expect(submitCount).toEqual(3);

        state.setInput('hello');
        await state.processRawChunk('\r', { submitOnEnter: false, ctrlKey: true });
        expect(state.input).toContain('\n');
    }

    @Test('session state tracks input history and skips slash commands')
    async sessionStateTracksInputHistory() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.pushInputHistory('first');
        state.pushInputHistory('/help');
        state.pushInputHistory('second');
        state.setInput('draft');

        expect(state.getInputHistoryEntries()).toEqual(['second', 'first']);
        expect(state.navigateInputHistory(-1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(state.navigateInputHistory(-1)).toEqual(true);
        expect(state.input).toEqual('first');
        expect(state.navigateInputHistory(1)).toEqual(true);
        expect(state.input).toEqual('second');
        expect(state.navigateInputHistory(1)).toEqual(true);
        expect(state.input).toEqual('draft');
        expect(state.navigateInputHistory(1)).toEqual(false);
    }

    @Test('component exposes notice and select helpers through shared ui state')
    async componentExposesNoticeAndSelectHelpers() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        component.showNotice('Switch model');
        expect(component.notice).toEqual('Switch model');

        const pending = component.select('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 0);

        expect(component.selectMenu?.title).toEqual('Model providers');
        expect(component.selectMenu?.selectedIndex).toEqual(0);

        await (component as any).state.chooseSelectMenuIndex(1);
        await expect(pending).resolves.toEqual('openai');
        expect(component.selectMenu).toEqual(undefined);

        component.clearNotice();
        expect(component.notice).toEqual('');
    }

    @Test('component loads unified mention catalog and enriches skill and plugin scope')
    async componentLoadsUnifiedMentionCatalog() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const tools = new ToolRegistryStub();
        tools.skills = [{ id: 'implement', title: 'Implement', summary: 'Implement the requested change.' }];
        tools.plugins = [{ id: 'com.example.review', scope: 'workspace', manifest: { name: 'Review', description: 'Review helpers' } }];
        const component = createConsole(runtime, scheduler, tools, undefined, undefined, new AgentConsoleWorkspaceMentionsProvider());
        component.configure({ sessionId: 'chat-unified-mentions', workspace: '/tmp/workspace' });
        await component.onInit();

        component.input = 'use @skill:implement with @plugin:com.example.review';
        await component.submit();

        expect(runtime.calls[0]).toContain("Activate skill 'implement': Implement the requested change.");
        expect(runtime.calls[0]).toContain("Plugin scope 'com.example.review' (workspace): Review helpers");
    }

    @Test('sessions command clears stale session state when no sessions remain')
    async sessionsCommandClearsStaleSessionStateWhenNoSessionsRemain() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.sessionState.setSessions([{
            id: 'chat-a',
            current: true,
            projectKey: 'project:exam-system',
            projectLabel: 'exam-system'
        } as any]);
        component.sessionState.setProjects([{
            key: 'project:exam-system',
            label: 'exam-system',
            sessionCount: 1
        } as any]);
        component.sessionState.setProjectContext({
            projectKey: 'project:exam-system',
            projectLabel: 'exam-system',
            projectSummary: 'old summary',
            projectSessionCount: 1
        });

        sessionService.sessions = [];
        sessionService.projectGroups = [];
        component.input = '/sessions';
        await component.submit();

        expect(component.notice).toEqual('No sessions available.');
        expect(component.sessionState.sessions).toEqual([]);
        expect(component.sessionState.projects).toEqual([]);
        expect(component.sessionState.projectLabel).toEqual('');
        expect(component.sessionState.projectSummary).toEqual('');
        expect(component.sessionState.projectSessionCount).toEqual(0);
    }

    @Test('openSession clears stale local plan todos before switching sessions')
    async openSessionClearsStaleLocalPlanTodosBeforeSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.sessionState.setPlanTodos([{
            id: 'todo-a',
            content: 'Old session todo',
            status: 'in_progress'
        } as any], 'chat-a');

        await (component as any).openSession('chat-b');

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.planTodos).toEqual([]);
        expect(component.sessionState.planTodoSourceSessionId).toEqual('');
    }

    @Test('openSession clears stale tool activity before switching sessions')
    async openSessionClearsStaleToolActivityBeforeSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.sessionState.setRunningTool('read_file');
        component.sessionState.upsertToolRun({
            name: 'read_file',
            status: 'running',
            message: 'Running',
            updatedAt: 1
        } as any);

        await (component as any).openSession('chat-b');

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.runningTools).toEqual([]);
        expect(component.sessionState.toolRuns).toEqual([]);
    }

    @Test('openSession clears stale context preparation before switching sessions')
    async openSessionClearsStaleContextPreparationBeforeSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.sessionState.setContextPreparation({
            strategy: 'summarize',
            beforeTokens: 1200,
            afterTokens: 600,
            targetTokens: 800,
            reason: 'Reduce prompt budget'
        } as any);

        await (component as any).openSession('chat-b');

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.contextPreparation).toEqual(null);
        expect(component.sessionState.contextPreparationSummary).toEqual('');
    }

    @Test('openSession clears stale approvals before switching sessions')
    async openSessionClearsStaleApprovalsBeforeSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        const approvals = new ApprovalManagerStub();
        approvals.pending = [];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, approvals, undefined, sessionService);

        component.sessionState.setPendingApprovals([{
            id: 'approval-a',
            toolName: 'write_file',
            reason: 'Need permission',
            inputSummary: 'stale request',
            timeoutMs: 30_000,
            createdAt: 1
        } as any]);
        component.sessionState.setApprovalsFocused(true);

        await (component as any).openSession('chat-b');

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.pendingApprovals).toEqual([]);
        expect(component.sessionState.selectedApproval).toEqual(undefined);
        expect(component.sessionState.approvalsFocused).toEqual(false);
    }

    @Test('openSession clears focused transient panels before switching sessions')
    async openSessionClearsFocusedTransientPanelsBeforeSwitchingSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 2 },
            { id: 'chat-b', current: false, lastActiveAt: 1 }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.sessionState.setProjectsFocused(true);
        component.sessionState.setToolRunsFocused(true);
        component.sessionState.setTasksFocused(true);
        component.sessionState.setJobsFocused(true);

        await (component as any).openSession('chat-b');

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.projectsFocused).toEqual(false);
        expect(component.sessionState.toolRunsFocused).toEqual(false);
        expect(component.sessionState.tasksFocused).toEqual(false);
        expect(component.sessionState.jobsFocused).toEqual(false);
    }

    @Test('openSession ignores stale ensureSession results from earlier switches')
    async openSessionIgnoresStaleEnsureSessionResultsFromEarlierSwitches() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 3 },
            { id: 'chat-b', current: false, lastActiveAt: 2 },
            { id: 'chat-c', current: false, lastActiveAt: 1 }
        ];
        sessionService.messagesBySession.set('chat-c', [{ id: 'msg-c', role: 'assistant', content: 'chat c', createdAt: 1 } as any]);
        const deferred = createDeferred<AgentConsoleSessionChoice>();
        sessionService.ensureSessionHandlers.set('chat-b', () => deferred.promise);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        const firstSwitch = (component as any).openSession('chat-b');
        await Promise.resolve();

        await (component as any).openSession('chat-c');
        expect(component.sessionId).toEqual('chat-c');
        expect(component.sessionState.messages.map(item => item.id)).toEqual(['msg-c']);

        deferred.resolve({ id: 'chat-b', current: true } as any);
        await firstSwitch;

        expect(component.sessionId).toEqual('chat-c');
        expect(component.sessionState.messages.map(item => item.id)).toEqual(['msg-c']);
    }

    @Test('openSession ignores stale message loads from earlier switches')
    async openSessionIgnoresStaleMessageLoadsFromEarlierSwitches() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 3 },
            { id: 'chat-b', current: false, lastActiveAt: 2 },
            { id: 'chat-c', current: false, lastActiveAt: 1 }
        ];
        const deferred = createDeferred<any[]>();
        sessionService.loadMessagesHandlers.set('chat-b', () => deferred.promise);
        sessionService.messagesBySession.set('chat-c', [{ id: 'msg-c', role: 'assistant', content: 'chat c', createdAt: 1 } as any]);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        const firstSwitch = (component as any).openSession('chat-b');
        await Promise.resolve();

        await (component as any).openSession('chat-c');
        expect(component.sessionId).toEqual('chat-c');
        expect(component.sessionState.messages.map(item => item.id)).toEqual(['msg-c']);

        deferred.resolve([{ id: 'msg-b', role: 'assistant', content: 'chat b', createdAt: 1 } as any]);
        await firstSwitch;

        expect(component.sessionId).toEqual('chat-c');
        expect(component.sessionState.messages.map(item => item.id)).toEqual(['msg-c']);
    }

    @Test('openSession persists current input history and reloads workspace history choices')
    async openSessionPersistsCurrentInputHistoryAndReloadsWorkspaceHistoryChoices() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const historyStore = new InputHistoryStoreStub();
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 3 },
            { id: 'chat-b', current: false, lastActiveAt: 2 },
            { id: 'chat-c', current: false, lastActiveAt: 1 }
        ];
        historyStore.setScopedEntries('/tmp/workspace-history', 'chat-b', ['history-b']);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-history' } } },
            historyStore
        );

        component.configure({ sessionId: 'chat-a', workspace: '/tmp/workspace-history' });
        component.sessionState.setInputHistoryEntries(['history-a']);

        await (component as any).openSession('chat-b');

        expect(component.sessionId).toEqual('chat-b');
        expect(component.sessionState.getInputHistoryEntries()).toEqual(['history-a', 'history-b']);
        expect(historyStore.saveCalls[0]).toEqual(['history-a']);
        expect(historyStore.sessionIds[0]).toEqual('chat-a');
        expect(historyStore.workspaces[1]).toEqual('/tmp/workspace-history');
        expect(historyStore.sessionIds[1]).toEqual('');

        await (component as any).openSession('chat-c');

        expect(component.sessionId).toEqual('chat-c');
        expect(component.sessionState.getInputHistoryEntries()).toEqual(['history-a', 'history-b']);
        expect(historyStore.saveCalls[1]).toEqual(['history-a', 'history-b']);
        expect(historyStore.sessionIds[2]).toEqual('chat-b');
        expect(historyStore.sessionIds[3]).toEqual('');
    }

    @Test('openSession follows the session workspace when reloading input history choices')
    async openSessionFollowsSessionWorkspaceForInputHistoryChoices() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const historyStore = new InputHistoryStoreStub();
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 3, workspace: '/tmp/workspace-a' },
            { id: 'chat-b', current: false, lastActiveAt: 2, workspace: '/tmp/workspace-b' }
        ];
        historyStore.setScopedEntries('/tmp/workspace-a', 'chat-a', ['alpha history']);
        historyStore.setScopedEntries('/tmp/workspace-b', 'chat-b', ['beta history']);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-a' } } },
            historyStore
        );

        component.configure({ sessionId: 'chat-a', workspace: '/tmp/workspace-a' });
        await component.onInit();
        component.sessionState.setInput('draft-a', 7);

        await (component as any).openSession('chat-b');

        expect(component.workspace).toEqual('/tmp/workspace-b');
        expect(component.sessionState.workspace).toEqual('/tmp/workspace-b');
        expect(component.sessionState.getInputHistoryEntries()).toEqual(['beta history']);
        expect(historyStore.workspaces).toContain('/tmp/workspace-b');
    }

    @Test('openSession keeps the configured workspace on initial launch even if ensureSession returns another workspace')
    async openSessionKeepsConfiguredWorkspaceOnInitialLaunch() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const historyStore = new InputHistoryStoreStub();
        const appRpc = new AppRpcStub();
        appRpc.state = {
            sessionId: 'chat-a',
            workspace: '/tmp/workspace-b'
        };
        sessionService.sessions = [{ id: 'chat-a', current: true, lastActiveAt: 3, workspace: '/tmp/workspace-b' }];
        sessionService.ensureSessionHandlers.set('chat-a', async () => ({ id: 'chat-a', current: true, workspace: '/tmp/workspace-b' } as any));
        historyStore.setScopedEntries('/tmp/workspace-a', 'chat-a', ['alpha history']);
        historyStore.setScopedEntries('/tmp/workspace-b', 'chat-a', ['beta history']);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            appRpc,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-a' } } },
            historyStore
        );

        component.configure({ sessionId: 'chat-a', workspace: '/tmp/workspace-a' });
        await component.onInit();

        expect(component.workspace).toEqual('/tmp/workspace-a');
        expect(component.sessionState.workspace).toEqual('/tmp/workspace-a');
        expect(component.sessionState.getInputHistoryEntries()).toEqual(['alpha history']);
    }

    @Test('cd command persists current workspace history and reloads the next workspace history')
    async cdCommandReloadsWorkspaceHistoryChoices() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const historyStore = new InputHistoryStoreStub();
        historyStore.setScopedEntries('/tmp/workspace-a', 'chat-a', ['alpha history']);
        historyStore.setScopedEntries('/tmp/workspace-b', 'chat-a', ['beta history']);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-a' } } },
            historyStore
        );

        component.configure({ sessionId: 'chat-a', workspace: '/tmp/workspace-a' });
        await component.onInit();
        component.sessionState.setInputHistoryEntries(['alpha history', 'draft alpha']);

        await (component as any).runCdCommand('/tmp/workspace-b');

        expect(component.sessionState.getInputHistoryEntries()).toEqual(['beta history']);
        expect(historyStore.saveCalls.some(call => call.includes('draft alpha'))).toBe(true);
        expect(historyStore.workspaces).toContain('/tmp/workspace-a');
        expect(historyStore.workspaces).toContain('/tmp/workspace-b');
    }

    @Test('openSession ignores stale switches blocked behind history persistence')
    async openSessionIgnoresStaleSwitchesBlockedBehindHistoryPersistence() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const historyStore = new InputHistoryStoreStub();
        const persistDeferred = createDeferred<void>();
        sessionService.sessions = [
            { id: 'chat-a', current: true, lastActiveAt: 3 },
            { id: 'chat-b', current: false, lastActiveAt: 2 },
            { id: 'chat-c', current: false, lastActiveAt: 1 }
        ];
        sessionService.messagesBySession.set('chat-c', [{ id: 'msg-c', role: 'assistant', content: 'chat c', createdAt: 1 } as any]);
        historyStore.saveHandlers.push(async () => persistDeferred.promise);
        const component = createConsole(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            sessionService,
            undefined,
            { ui: { title: 'Console', console: { workspace: '/tmp/workspace-history' } } },
            historyStore
        );

        component.configure({ sessionId: 'chat-a', workspace: '/tmp/workspace-history' });
        component.sessionState.setInputHistoryEntries(['history-a']);

        const firstSwitch = (component as any).openSession('chat-b');
        await Promise.resolve();

        const secondSwitch = (component as any).openSession('chat-c');
        persistDeferred.resolve();
        await Promise.all([firstSwitch, secondSwitch]);

        expect(component.sessionId).toEqual('chat-c');
        expect(component.sessionState.messages.map(item => item.id)).toEqual(['msg-c']);
    }

    @Test('sessions command refreshes grouped project sessions into the panel state')
    async sessionsCommandRefreshesGroupedProjectSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [
            {
                projectKey: 'project:exam-system',
                projectId: 'exam-system',
                label: 'exam-system',
                workspace: '/tmp/project-a',
                sessionCount: 2,
                lastActiveAt: 2,
                sessions: [
                    { id: 'chat-a', workspace: '/tmp/project-a', messageCount: 2, lastActiveAt: 2 },
                    { id: 'chat-b', workspace: '/tmp/project-b', messageCount: 1, lastActiveAt: 1 }
                ]
            },
            {
                projectKey: 'workspace:/tmp/project-c',
                label: '/tmp/project-c',
                workspace: '/tmp/project-c',
                sessionCount: 1,
                lastActiveAt: 3,
                sessions: [
                    { id: 'chat-c', workspace: '/tmp/project-c', messageCount: 3, lastActiveAt: 3 }
                ]
            }
        ];

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).handleCommand('/sessions');

        expect(component.sessionState.sessions.map(item => ({
            id: item.id,
            projectKey: item.projectKey,
            projectLabel: item.projectLabel
        }))).toEqual([
            { id: 'chat-a', projectKey: 'project:exam-system', projectLabel: 'exam-system' },
            { id: 'chat-b', projectKey: 'project:exam-system', projectLabel: 'exam-system' },
            { id: 'chat-c', projectKey: 'workspace:/tmp/project-c', projectLabel: '/tmp/project-c' }
        ]);
        expect(component.sessionState.sessionsFocused).toEqual(true);
    }

    @Test('sessions command preserves focus summary labels from grouped sessions')
    async sessionsCommandPreservesFocusSummaryLabelsFromGroupedSessions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        sessionService.projectGroups = [{
            projectKey: 'session:chat-a',
            label: 'Investigate flaky worker startup',
            workspace: '',
            focusSummary: 'Investigate flaky worker startup',
            sessionCount: 1,
            lastActiveAt: 2,
            sessions: [{
                id: 'chat-a',
                messageCount: 2,
                lastActiveAt: 2,
                focusSummary: 'Investigate flaky worker startup'
            }]
        }];

        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);
        await (component as any).handleCommand('/sessions');

        expect(component.sessionState.sessions.map(item => ({
            id: item.id,
            projectLabel: item.projectLabel,
            focusSummary: item.focusSummary
        }))).toEqual([
            {
                id: 'chat-a',
                projectLabel: 'Investigate flaky worker startup',
                focusSummary: 'Investigate flaky worker startup'
            }
        ]);
        expect(component.sessionState.projects.map(item => item.label)).toEqual(['Investigate flaky worker startup']);
    }

    @Test('left arrow after workspace suggestion selection moves cursor correctly')
    async leftArrowAfterWorkspaceSuggestionMovesCursorCorrectly() {
        const workspace = createWorkspaceFixture();
        try {
            const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
            let submitCalled = false;
            state.submitAction = async () => {
                submitCalled = true;
            };
            state.setWorkspace(workspace);
            state.setWorkspaceMentionResolver(createWorkspaceMentionsProvider());

            state.setInput('@sr', 3);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.title).toEqual('Suggestions');
            expect(state.selectMenu?.options.find(o => o.value === '@src/')).toBeDefined();

            await state.confirmSelectMenu('@src/');
            expect(state.input).toEqual('@src/ ');
            expect(state.selectMenu).toBeUndefined();

            const fullText = '@src/ 写测试用例，';
            state.setInput(fullText, fullText.length);
            expect(state.input).toEqual(fullText);
            expect(state.inputCursor).toEqual(fullText.length); // fullText.length = 12

            // Helper: simulate left arrow
            const pressLeft = async (s: AgentConsoleSessionState): Promise<boolean> => {
                const outcome = await s.processDecodedInput(
                    { text: '\u001b[D', controlKey: 'left', partial: false },
                    '\u001b[D',
                    { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false }
                );
                if (outcome.handled && outcome.action === 'draftNavigation' && outcome.value === 'left') {
                    s.moveInputCursor(-1);
                    return true;
                }
                return outcome.handled;
            };

            // fullText = '@src/ 写测试用例，' (12 chars: @ s r c / space 写 测 试 用 例 ，)
            // Cursor starts at position 12
            expect(state.inputCursor).toEqual(12);

            // Move through the 6 Chinese chars (positions 11,10,9,8,7,6)
            for (let i = 0; i < 6; i++) {
                const handled = await pressLeft(state);
                expect(handled).toEqual(true);
                expect(state.inputCursor).toEqual(11 - i);
                expect(state.input).not.toContain('[D');
                expect(state.input).not.toContain('\n');
                expect(state.input).not.toContain('\r');
            }
            expect(state.inputCursor).toEqual(6);
            expect(submitCalled).toEqual(false);

            // Press left into the space (position 5)
            await pressLeft(state);
            expect(state.inputCursor).toEqual(5);
            expect(submitCalled).toEqual(false);

            // Press left into @src/ (position 4)
            await pressLeft(state);
            expect(state.inputCursor).toEqual(4);
            expect(submitCalled).toEqual(false);

            // Press left through @src/ (positions 3,2,1,0)
            for (let i = 0; i < 4; i++) {
                await pressLeft(state);
                expect(state.input).not.toContain('[D');
                expect(state.input).not.toContain('\n');
            }
            expect(state.inputCursor).toEqual(0);
            expect(submitCalled).toEqual(false);

            // Left at position 0 should stay at 0
            await pressLeft(state);
            expect(state.inputCursor).toEqual(0);
            expect(state.input).toEqual(fullText);
            expect(submitCalled).toEqual(false);

            // Press right back through
            const pressRight = async (s: AgentConsoleSessionState): Promise<boolean> => {
                const outcome = await s.processDecodedInput(
                    { text: '\u001b[C', controlKey: 'right', partial: false },
                    '\u001b[C',
                    { isClosed: false, onExit: () => {}, hasActiveTextPrompt: false }
                );
                if (outcome.handled && outcome.action === 'draftNavigation' && outcome.value === 'right') {
                    s.moveInputCursor(1);
                    return true;
                }
                return outcome.handled;
            };

            for (let i = 0; i < 6; i++) {
                await pressRight(state);
                expect(state.input).not.toContain('[C');
                expect(state.input).not.toContain('\n');
            }
            expect(state.inputCursor).toEqual(6);
            expect(submitCalled).toEqual(false);

        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('processRawChunk with workspace file suggestion does not submit')
    async processRawChunkWithWorkspaceSuggestionDoesNotSubmit() {
        const workspace = createWorkspaceFixture();
        try {
            const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
            let submitCount = 0;
            state.submitAction = async () => { submitCount++; };
            state.setWorkspace(workspace);
            state.setWorkspaceMentionResolver(createWorkspaceMentionsProvider());
            state.setInput('check @sr', 'check @sr'.length);
            await waitForSuggestionMenu(state);
            expect(state.selectMenu?.title).toEqual('Suggestions');
            const wsResult = await state.processRawChunk('\r', { submitOnEnter: true, hasSelectMenu: true });
            expect(wsResult.confirmedSelection).toEqual(true);
            expect(wsResult.submitted).toEqual(false);
            expect(state.input).toContain('@src/');
            expect(state.input).not.toContain('\r');
            expect(state.input).not.toContain('\n');
            expect(submitCount).toEqual(0);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
