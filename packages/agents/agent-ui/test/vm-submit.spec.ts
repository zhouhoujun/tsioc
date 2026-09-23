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
import {TestFileAdapter, AudioCaptureStub, AudioPlaybackStub, RuntimeStub, FailingRuntimeStub, SchedulerStub, ToolRegistryStub, EventMulticasterStub, ApplicationContextStub, AppRpcStub, SessionServiceStub, createDeferred, createConsole, createConsoleParts, InputHistoryStoreStub, waitForCondition, createWorkspaceFixture, createWorkspaceMentionsProvider} from './_helpers';

@Suite('Agent console submit/turn/queue')
export class VmSubmitTest {
    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('submit updates messages and clears input')
    async submitUpdatesState() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.input = 'hello';
        await component.submit();
        expect(runtime.calls).toEqual(['console:hello']);
        expect(component.messages.length).toEqual(2);
        expect(component.messages[1].content).toEqual('Echo: hello');
        expect(component.input).toEqual('');
        expect(component.status).toEqual('idle');
        expect(component.activities.length).toBeGreaterThan(0);
        expect(component.runningTools).toEqual([]);
    }

    @Test('submit streams locally without app rpc')
    async submitStreamsLocallyWithoutAppRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, undefined, undefined, undefined);
        component.input = 'hello';
        await component.submit();
        expect(runtime.calls).toEqual(['console:hello']);
        expect(component.messages[1].metadata?.streaming).toEqual(false);
        expect(component.messages[1].content).toEqual('Echo: hello');
        expect(component.status).toEqual('idle');
    }

    @Test('pending tool calls render human labels with their primary argument')
    async pendingToolCallsRenderHumanLabels() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        const summary = (component as any).describePendingToolCall({
            content: 'read_file, glob_search, content_search',
            toolCalls: [
                { name: 'read_file', input: { path: 'exam-system/src/scoring.js' } },
                { name: 'glob_search', input: { pattern: '**/*.ts' } },
                { name: 'content_search', input: { query: 'scorePaper' } }
            ]
        });

        expect(summary).toContain('exam-system/src/scoring.js');
        expect(summary).toContain('**/*.ts');
        expect(summary).toContain('scorePaper');
        expect(summary).not.toContain('read_file,');
    }

    @Test('pending tool call falls back to the raw content without structured calls')
    async pendingToolCallFallsBackWithoutStructuredCalls() {
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        expect((component as any).describePendingToolCall({})).toEqual('tool');
        expect((component as any).describePendingToolCall({ content: 'read_file' })).toContain('read');
    }

    @Test('attach command queues image and submit sends structured parts to the runtime')
    async attachCommandQueuesImageAndSubmitSendsStructuredParts() {        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        app.registry.set(FileAdapter, new TestFileAdapter());
        const workspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-ui-attach-'));
        await fs.promises.writeFile(path.join(workspace, 'cat.png'), this.pngFixture());
        const { component, state } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ workspace });

        component.input = '/attach cat.png';
        await component.submit();
        expect(state.pendingAttachments.length).toBe(1);

        component.input = 'describe';
        await component.submit();

        expect(runtime.calls).toEqual(['console:describe']);
        expect(runtime.turnMessages[0]?.parts?.[0]).toEqual({ type: 'text', text: 'describe' });
        expect(runtime.turnMessages[0]?.parts?.[1]?.type).toBe('image');
        expect(String(runtime.turnMessages[0]?.parts?.[1]?.imageUrl || '')).toContain('data:image/png;base64,');
        expect(state.pendingAttachments).toEqual([]);
        expect((component.messages[0] as any).parts?.[1]?.type).toBe('image');
    }

    @Test('attach command forwards structured parts through app rpc streaming turns')
    async attachCommandForwardsStructuredPartsThroughRpc() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        app.registry.set(FileAdapter, new TestFileAdapter());
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'text', content: 'done' },
            { type: 'done' }
        ];
        const workspace = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-ui-attach-rpc-'));
        await fs.promises.writeFile(path.join(workspace, 'cat.png'), this.pngFixture());
        const { component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app, undefined, undefined, undefined, appRpc);
        component.configure({ workspace });

        component.input = '/attach cat.png';
        await component.submit();
        component.input = 'describe';
        await component.submit();

        const streamCall = appRpc.calls.find(call => call.method === 'run.turn_stream');
        expect(streamCall).toBeTruthy();
        expect(streamCall?.params?.message?.parts?.[0]).toEqual({ type: 'text', text: 'describe' });
        expect(streamCall?.params?.message?.parts?.[1]?.type).toBe('image');
        expect(String(streamCall?.params?.message?.parts?.[1]?.imageUrl || '')).toContain('data:image/png;base64,');
    }

    @Test('submit falls back to described content when rpc chunks omit structured data')
    async submitFallsBackToDescribedContentForObservabilityEvents() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' },
            {
                type: 'event',
                eventType: 'context_prepared',
                label: 'model',
                status: 'success',
                content: 'Context unchanged (5000 tokens)'
            },
            {
                type: 'event',
                eventType: 'turn_diagnostics',
                label: 'state',
                status: 'success',
                content: 'Turn diagnostics: no compaction performed'
            },
            { type: 'text', content: 'ok' },
            {
                type: 'done',
                message: {
                    id: 'done-1',
                    role: 'assistant',
                    content: 'ok',
                    createdAt: 2,
                    metadata: { usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }
                }
            }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = 'next';
        await component.submit();

        expect(component.activities.some(activity =>
            activity.kind === 'model' && activity.message.includes('Context unchanged')
        )).toEqual(true);
        expect(component.activities.some(activity =>
            activity.message.includes('no compaction performed')
        )).toEqual(true);
    }

    @Test('submit scopes repeated stream event keys per turn')
    async submitScopesRepeatedStreamEventKeysPerTurn() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        appRpc.streamChunks = [
            { type: 'event', eventType: 'turn_started', label: 'state', status: 'running', content: 'Analyzing request' },
            { type: 'event', eventType: 'tool_completed', label: 'tool', status: 'success', toolName: 'read_file', toolCallId: 'c1', content: 'read_file · src/index.ts' },
            { type: 'text', content: 'Patched handler' },
            {
                type: 'done',
                message: {
                    id: 'done-1',
                    role: 'assistant',
                    content: 'Patched handler',
                    createdAt: 2,
                    metadata: {
                        usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 }
                    }
                }
            }
        ];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, undefined, appRpc);
        await component.onInit();

        component.input = 'fix it';
        await component.submit();
        component.input = 'fix it again';
        await component.submit();

        const eventMessages = component.sessionState.messages.filter(message => message.metadata?.uiKind === 'event');
        expect(eventMessages.map(message => message.content)).toEqual([
            'Analyzing request',
            'read file completed · src/index.ts',
            'Analyzing request',
            'read file completed · src/index.ts'
        ]);
        expect(new Set(eventMessages.map(message => message.metadata?.uiEventKey)).size).toEqual(4);
    }

    @Test('submit persists input history through history store')
    async submitPersistsInputHistory() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const historyStore = new InputHistoryStoreStub();
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

        await component.onInit();
        component.input = 'hello';
        await component.submit();

        expect(historyStore.saveCalls[historyStore.saveCalls.length - 1]).toEqual(['hello']);
        expect(historyStore.workspaces[historyStore.workspaces.length - 1]).toEqual('/tmp/workspace-a');
    }

    @Test('submit keeps short follow-up answers raw before runtime request construction')
    async submitKeepsContinuationAnswerRaw() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '查看今天的天气', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '请告诉我你想查看哪个城市或地区的今天天气。', createdAt: 2 } as any
        ]);
        component.input = '成都';

        await component.submit();

        expect(runtime.calls).toHaveLength(1);
        expect(runtime.calls[0]).toEqual('console:成都');
    }

    @Test('submit clears stale visible activities from the previous turn')
    async submitClearsStaleVisibleActivities() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.sessionState.pushActivity('error', 'old failure');
        component.sessionState.pushActivity('tool', 'old tool run');

        component.input = 'hello';
        await component.submit();

        expect(component.sessionState.visibleActivities).toEqual([]);
        expect(component.lastError).toEqual('');
    }

    @Test('submit exposes running state before the turn completes')
    async submitExposesRunningStateBeforeCompletion() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        let releaseTurn!: () => void;
        (runtime as any).runStreamingTurn = undefined;
        runtime.runTurn = async (sessionId: string, input: string): Promise<any> => {
            runtime.calls.push(`${sessionId}:${input}`);
            await new Promise<void>(resolve => {
                releaseTurn = resolve;
            });
            runtime.messages = [
                { id: '1', role: 'user', content: input, createdAt: 1 },
                { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
            ] as any;
            return { sessionId, message: runtime.messages[1] };
        };
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.input = 'hello';
        const submitPromise = component.submit();
        await waitForCondition(() => component.status === 'running' && typeof releaseTurn === 'function');
        expect(component.status).toEqual('running');
        expect(typeof releaseTurn).toEqual('function');
        releaseTurn();
        await submitPromise;
        expect(component.status).toEqual('idle');
    }

    @Test('submit enriches mention context inside agent ui')
    async submitEnrichesMentionContextInsideAgentUi() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.configure({
            sessionId: 'chat-mentions',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            workspace: '/tmp/workspace'
        });
        await component.onInit();

        component.input = 'check @workspace and @read_file';
        await component.submit();

        expect(runtime.calls[0]).toContain('[Mention Context]');
        expect(runtime.calls[0]).toContain('Workspace: /tmp/workspace');
        expect(runtime.calls[0]).toContain('Tool read_file: toolset=filesystem, active=no');
    }

    @Test('submit enriches workspace file and directory mentions inside agent ui')
    async submitEnrichesWorkspaceMentionsInsideAgentUi() {
        const workspace = createWorkspaceFixture();
        try {
            const runtime = new RuntimeStub();
            const scheduler = new SchedulerStub();
            const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, createWorkspaceMentionsProvider());
            component.configure({
                sessionId: 'chat-workspace-mentions',
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                workspace
            });
            await component.onInit();

            component.input = 'check @src/ and @docs/';
            await component.submit();

            expect(runtime.calls[0]).toContain('[Mention Context]');
            expect(runtime.calls[0]).toContain('src/');
            expect(runtime.calls[0]).toContain('src/index.ts');
            expect(runtime.calls[0]).toContain('src/feature.ts');
            expect(runtime.calls[0]).toContain('docs/');
            expect(runtime.calls[0]).toContain('docs/guides/');
            expect(runtime.calls[0]).not.toContain('dist/bundle.js');
            expect(runtime.calls[0]).not.toContain('export const demo = 1;');
            expect(runtime.calls[0]).not.toContain('export const feature = () => "ok";');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('clear command starts a new session after submit')
    async clearCommandStartsNewSessionAfterSubmit() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const sessionService = new SessionServiceStub(runtime);
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, undefined, undefined, sessionService);

        component.input = '/clear';
        await component.submit();

        expect(component.input).toEqual('');
        expect(sessionService.ensuredSessionIds).toEqual([undefined]);
        expect(component.sessionId).not.toEqual('console');
        expect(component.notice).toEqual('Started a new session.');
    }

    @Test('submit keeps draft intact while a turn is already running')
    async submitKeepsDraftIntactWhileTurnRunning() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const { component } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', queueMode: false, steerMode: false } }
        );

        component.sessionState.setStatus('running');
        component.input = 'hello again';
        await component.submit();

        expect(runtime.calls).toEqual([]);
        expect(component.input).toEqual('hello again');
        expect(component.notice).toEqual('Wait for the current turn to finish.');
    }

    @Test('submit failure resets ui state and records error')
    async submitFailureResetsUiStateAndRecordsError() {
        const runtime = new FailingRuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());

        component.input = 'hello';
        await component.submit();

        expect(component.input).toEqual('');
        expect(component.status).toEqual('error');
        expect(component.lastError).toEqual('submit failed');
        expect(component.activities.some(item => item.kind === 'error' && item.message.includes('submit failed'))).toBe(true);
        expect(component.messages[component.messages.length - 1]?.role).toEqual('assistant');
        expect(component.messages[component.messages.length - 1]?.content).toContain('Error: submit failed');
    }

    @Test('busy enter queues prompts FIFO and drains them when the turn is idle')
    async busyEnterQueuesAndDrainsPrompts() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(
            runtime,
            new SchedulerStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', steerMode: false } }
        );
        component.configure({ sessionId: 'queue-session' });
        state.setStatus('running');

        state.setInput('first queued');
        await component.submit();
        state.setInput('second queued');
        await component.submit();

        expect(runtime.calls).toEqual([]);
        expect(state.queuedPromptCount).toEqual(2);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('Queued prompt (2)');

        state.setStatus('idle');
        await (component as any).drainQueuedPrompts('queue-session');
        expect(runtime.calls).toEqual(['queue-session:first queued', 'queue-session:second queued']);
        expect(state.queuedPromptCount).toEqual(0);
    }

    @Test('queue mode can be disabled without clearing the busy draft')
    async queueModeCanBeDisabled() {
        const { state, component } = createConsoleParts(
            new RuntimeStub(),
            new SchedulerStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', queueMode: false, steerMode: false } }
        );
        state.setStatus('running');
        state.setInput('keep this draft');
        await component.submit();
        expect(state.queuedPromptCount).toEqual(0);
        expect(state.input).toEqual('keep this draft');
        expect(state.notice).toContain('Wait for the current turn');
    }

    @Test('enter during a running turn queues by default without cancelling the turn')
    async enterDuringRunningTurnQueuesByDefault() {
        const runtime = new RuntimeStub();
        const { state, component, sessionService } = createConsoleParts(runtime, new SchedulerStub());
        component.configure({ sessionId: 'queue-default' });
        let cancellations = 0;
        (sessionService as any).cancelTurn = async () => { cancellations += 1; return true; };
        state.setStatus('running');
        state.setInput('next question');

        await component.submit();

        expect(cancellations).toEqual(0);
        expect(runtime.calls).toEqual([]);
        expect(state.queuedPromptCount).toEqual(1);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('Queued prompt (1)');
    }

    @Test('enter during a running turn steers when steer mode is enabled: interrupts and resubmits')
    async enterDuringRunningTurnSteersWhenEnabled() {
        const runtime = new RuntimeStub();
        const { state, component, sessionService } = createConsoleParts(
            runtime,
            new SchedulerStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', steerMode: true } }
        );
        component.configure({ sessionId: 'steer-session' });
        let cancellations = 0;
        (sessionService as any).cancelTurn = async () => { cancellations += 1; return true; };
        state.setStatus('running');
        state.setInput('steer the turn');

        await component.submit();

        expect(cancellations).toEqual(1);
        expect(runtime.calls).toEqual(['steer-session:steer the turn']);
        expect(state.queuedPromptCount).toEqual(0);
        expect(state.input).toEqual('');
        const steerMessage = state.messages.find(message => message.metadata?.kind === 'steer');
        expect(steerMessage?.content).toEqual('steer the turn');
    }

    @Test('steer mode disabled falls back to queueing during a running turn')
    async steerModeDisabledFallsBackToQueue() {
        const runtime = new RuntimeStub();
        const { state, component } = createConsoleParts(
            runtime,
            new SchedulerStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { ui: { title: 'Console', steerMode: false } }
        );
        component.configure({ sessionId: 'queue-session' });
        state.setStatus('running');
        state.setInput('queued instead');

        await component.submit();

        expect(runtime.calls).toEqual([]);
        expect(state.queuedPromptCount).toEqual(1);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('Queued prompt (1)');
    }

    @Test('tab during a running turn queues the draft as a prompt')
    async tabDuringRunningTurnQueuesDraft() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        state.setStatus('running');
        state.setInput('draft to queue');

        const outcome = await (state as any).processDecodedInput(
            { text: '', controlKey: 'tab', partial: false },
            '\t' as any,
            { isClosed: false, onExit: () => undefined, hasActiveTextPrompt: false }
        );

        expect(outcome).toEqual({ handled: true, action: 'queueDraft' });
        expect(state.queuedPromptCount).toEqual(0);
        expect(state.input).toEqual('draft to queue');

        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        expect(state.queuedPromptCount).toEqual(1);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('Queued prompt (1)');
    }

    @Test('tab during an idle turn does not queue the draft')
    async tabDuringIdleTurnDoesNotQueue() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        state.setInput('idle draft');

        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        expect(state.queuedPromptCount).toEqual(0);
        expect(state.input).toEqual('idle draft');
    }

    @Test('tab during a running turn queues a slash draft as a next-turn command')
    async tabDuringRunningTurnQueuesSlashCommand() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        state.setStatus('running');
        state.setInput('/compact trim');

        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');

        expect(state.queuedPromptCount).toEqual(1);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('Queued command (1)');
        const entries = (component as any).queuedPrompts.get('console') || [];
        expect(entries[0].command).toEqual(true);
    }

    @Test('queued slash command skips pending attachments and plain prompt keeps them')
    async queuedSlashCommandSkipsAttachments() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        state.setStatus('running');

        state.setPendingAttachments([{ id: 'a1', kind: 'image', path: '/ws/a.png', name: 'a.png', imageUrl: 'data:image/png;base64,AAA' } as any]);
        state.setInput('/compact');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');

        state.setPendingAttachments([{ id: 'a2', kind: 'image', path: '/ws/b.png', name: 'b.png', imageUrl: 'data:image/png;base64,BBB' } as any]);
        state.setInput('describe the image');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');

        const entries = (component as any).queuedPrompts.get('console') || [];
        expect(entries.length).toEqual(2);
        expect(entries[0].command).toEqual(true);
        expect(entries[0].attachments).toEqual([]);
        expect(entries[1].command).toEqual(false);
        expect(entries[1].attachments.length).toEqual(1);
    }

    @Test('queued slash command dispatches as a command when the turn ends')
    async queuedSlashCommandDispatchesAfterTurnEnds() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            appRpc
        );
        await component.onInit();
        state.setStatus('running');
        state.setInput('/compact trim');

        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        expect(state.queuedPromptCount).toEqual(1);
        expect(state.notice).toContain('Queued command (1)');
        expect(runtime.calls).toEqual([]);

        state.setStatus('idle');
        await (component as any).drainQueuedPrompts('console');

        expect(runtime.calls).toEqual([]);
        expect(appRpc.calls.some(call => call.method === 'session.compact')).toEqual(true);
        expect(state.queuedPromptCount).toEqual(0);
    }

    @Test('queued prompts and commands drain in fifo order after the turn')
    async queuedPromptsAndCommandsDrainInFifoOrder() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const appRpc = new AppRpcStub();
        const { state, component } = createConsoleParts(
            runtime,
            scheduler,
            new ToolRegistryStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            appRpc
        );
        await component.onInit();
        state.setStatus('running');

        state.setInput('first prompt');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        state.setInput('/compact');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        state.setInput('second prompt');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');

        expect(state.queuedPromptCount).toEqual(3);
        expect(state.notice).toContain('Queued prompt (3)');
        expect(runtime.calls).toEqual([]);

        state.setStatus('idle');
        await (component as any).drainQueuedPrompts('console');

        const turnCalls = appRpc.calls.filter(call => call.method === 'run.turn_stream');
        expect(turnCalls.map(call => call.params?.input)).toEqual(['first prompt', 'second prompt']);
        expect(appRpc.calls.some(call => call.method === 'session.compact')).toEqual(true);
        expect(state.queuedPromptCount).toEqual(0);
    }

    @Test('queue command lists queued prompts and clears them')
    async queueCommandListsAndClears() {
        const { state, component } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        await component.onInit();
        state.setStatus('running');

        state.setInput('follow-up prompt');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        state.setInput('/compact');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'tab', partial: false }, '\t');
        expect(state.queuedPromptCount).toEqual(2);

        await (component as any).handleCommand('/queue');
        expect(state.commandOutputs.some(entry => entry.command === '/queue list')).toEqual(true);
        const listed = state.commandOutputs.find(entry => entry.command === '/queue list');
        expect(listed?.text).toContain('Queued prompts (2)');
        expect(listed?.text).toContain('follow-up prompt');
        expect(listed?.text).toContain('[command] /compact');

        await (component as any).handleCommand('/queue clear');
        expect(state.queuedPromptCount).toEqual(0);
        expect(state.notice).toContain('Cleared 2 queued prompts.');

        await (component as any).handleCommand('/queue');
        expect(state.notice).toContain('No queued prompts');
    }

    @Test('unsetting escape disables the configured interrupt binding but Esc still interrupts a running turn')
    async unsettingEscapeDisablesInterrupt() {
        const { state, component, sessionService } = createConsoleParts(new RuntimeStub(), new SchedulerStub());
        let cancellations = 0;
        (sessionService as any).cancelTurn = async () => { cancellations += 1; return true; };
        await component.onInit();
        (component as any).globalKeymap.unset('escape');
        state.setStatus('running');
        // With no keymap binding, Esc must still interrupt the running turn via
        // the decoded-input fallback (it must not be swallowed).
        await (component as any).handleTerminalInput({ text: '\u001b', partial: false }, '\u001b');
        expect(cancellations).toEqual(1);
    }
}
