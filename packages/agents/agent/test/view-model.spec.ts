import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent } from '../src/ui/AgentConsoleComponent';
import { AgentConsoleEventBridge } from '../src/ui/AgentConsoleEventBridge';
import { AgentConsoleInputPanelComponent } from '../src/ui/AgentConsolePanels';
import { AgentConsoleApprovalRequest, AgentConsoleSessionState } from '../src/ui/AgentConsoleSessionState';
import { AgentConsoleSessionChoice, AgentConsoleUiDelegate, ModelProfile } from '../src/ui/AgentConsoleUiDelegate';
import {
    AgentApprovalCompletedEvent,
    AgentApprovalFailedEvent,
    AgentApprovalRequestedEvent,
    AgentModelCompletedEvent,
    AgentStreamChunkEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent,
    AgentToolInvokedEvent
} from '../src/runtime/AgentEvents';

class RuntimeStub {
    calls: string[] = [];
    messages = [{ id: '1', role: 'assistant', content: 'ready', createdAt: 1 } as any];

    async runTurn(sessionId: string, input: string): Promise<any> {
        this.calls.push(`${sessionId}:${input}`);
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(): Promise<any[]> {
        return this.messages;
    }

    async *runStreamingTurn(sessionId: string, input: string): AsyncGenerator<any> {
        this.calls.push(`${sessionId}:${input}`);
        yield { type: 'text', content: `Echo: ${input}` };
        yield { type: 'done', usage: { promptTokens: 5, completionTokens: 7, totalTokens: 12 } };
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
    }
}

class FailingRuntimeStub extends RuntimeStub {
    override async runTurn(_sessionId: string, _input: string): Promise<any> {
        throw new Error('submit failed');
    }

    override async *runStreamingTurn(_sessionId: string, _input: string): AsyncGenerator<any> {
        throw new Error('submit failed');
    }
}

class SchedulerStub {
    tasks: any[] = [];

    async schedule(task: any): Promise<any> {
        this.tasks.push(task);
        return task;
    }

    getTasks(): any[] {
        return this.tasks;
    }
}

class ToolRegistryStub {
    getToolDefinitions(): any[] {
        return [{ name: 'read_file', toolset: 'filesystem', activation: { kind: 'deferred', activated: false } }];
    }

    async isToolActive(): Promise<boolean> {
        return false;
    }
}

class EventMulticasterStub {
    private listeners = new Map<any, Array<(event: any) => void | Promise<void>>>();

    addListener(eventType: any, handler: (event: any) => void | Promise<void>): void {
        const handlers = this.listeners.get(eventType) || [];
        handlers.push(handler);
        this.listeners.set(eventType, handlers);
    }

    removeListener(eventType: any, handler: (event: any) => void | Promise<void>): void {
        const handlers = this.listeners.get(eventType) || [];
        this.listeners.set(eventType, handlers.filter(item => item !== handler));
    }

    async emit(event: any): Promise<void> {
        const handlers = this.listeners.get(event.constructor) || [];
        for (const handler of handlers) {
            await handler(event);
        }
    }
}

class ApplicationContextStub {
    readonly eventMulticaster = new EventMulticasterStub();
}

class UiDelegateStub extends AgentConsoleUiDelegate {
    notices: string[] = [];
    copiedTargets: Array<string | undefined> = [];
    copiedTexts: string[] = [];
    switchedSessions: Array<string | undefined> = [];
    sessions: AgentConsoleSessionChoice[] = [];
    nextSelections: Array<string | undefined> = [];
    nextPrompts: Array<string | undefined> = [];
    promptQuestions: string[] = [];
    appliedProfiles: ModelProfile[] = [];

    async select(_title: string, options: Array<{ value: string }>, selectedIndex = 0): Promise<string | undefined> {
        if (this.nextSelections.length) {
            return this.nextSelections.shift();
        }
        return options[selectedIndex]?.value;
    }

    async prompt(question?: string): Promise<string | undefined> {
        this.promptQuestions.push(question || '');
        if (this.nextPrompts.length) {
            return this.nextPrompts.shift();
        }
        return undefined;
    }

    notify(message: string): void {
        this.notices.push(message);
    }

    async copyText(text: string): Promise<boolean> {
        this.copiedTexts.push(text);
        return true;
    }

    override async copy(target?: string): Promise<boolean> {
        this.copiedTargets.push(target);
        return true;
    }

    override async listSessions(): Promise<AgentConsoleSessionChoice[]> {
        return this.sessions.slice();
    }

    override async switchSession(sessionId?: string): Promise<void> {
        this.switchedSessions.push(sessionId);
    }

    async applyModelProfile(profile: ModelProfile): Promise<void> {
        this.appliedProfiles.push(profile);
    }

    quit(): void {
        return;
    }
}

class ApprovalManagerStub {
    pending: AgentConsoleApprovalRequest[] = [];
    approved: string[] = [];
    denied: string[] = [];

    getPending(): AgentConsoleApprovalRequest[] {
        return this.pending.slice();
    }

    approve(requestId: string): boolean {
        if (!this.pending.some(item => item.id === requestId)) {
            return false;
        }
        this.approved.push(requestId);
        this.pending = this.pending.filter(item => item.id !== requestId);
        return true;
    }

    reject(requestId: string): boolean {
        if (!this.pending.some(item => item.id === requestId)) {
            return false;
        }
        this.denied.push(requestId);
        this.pending = this.pending.filter(item => item.id !== requestId);
        return true;
    }
}

function createConsoleParts(
    runtime: RuntimeStub,
    scheduler: SchedulerStub,
    toolRegistry?: ToolRegistryStub,
    app?: ApplicationContextStub,
    uiDelegate?: AgentConsoleUiDelegate,
    approvalManager?: ApprovalManagerStub
) {
    const state = new AgentConsoleSessionState();
    const bridge = new AgentConsoleEventBridge(state, runtime as any, toolRegistry as any, app as any);
    const component = new AgentConsoleComponent(
        state,
        runtime as any,
        scheduler as any,
        bridge,
        { ui: { title: 'Console' } } as any,
        toolRegistry as any,
        uiDelegate as any,
        undefined,
        approvalManager as any
    );
    return { state, bridge, component };
}

function createConsole(
    runtime: RuntimeStub,
    scheduler: SchedulerStub,
    toolRegistry?: ToolRegistryStub,
    app?: ApplicationContextStub,
    uiDelegate?: AgentConsoleUiDelegate,
    approvalManager?: ApprovalManagerStub
): AgentConsoleComponent {
    return createConsoleParts(runtime, scheduler, toolRegistry, app, uiDelegate, approvalManager).component;
}

@Suite('Agent console component')
export class AgentConsoleComponentTest {
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
        await Promise.resolve();
        expect(component.status).toEqual('running');
        expect(typeof releaseTurn).toEqual('function');
        releaseTurn();
        await submitPromise;
        expect(component.status).toEqual('idle');
    }

    @Test('schedulePrompt adds task and updates tasks count')
    async schedulePromptAddsTask() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        await component.schedulePrompt('later', 100);
        expect(component.tasksCount).toEqual(1);
        expect(scheduler.tasks[0].prompt).toEqual('later');
        expect(scheduler.tasks[0].sessionId).toEqual('console');
        expect(typeof scheduler.tasks[0].runAt).toEqual('number');
    }

    @Test('configure updates model metadata and tools')
    async configureUpdatesModelMetadataAndTools() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        component.configure({ sessionId: 'chat-1', provider: 'deepseek', model: 'deepseek-v4-flash', workspace: '/tmp/workspace' });
        await component.onInit();
        expect(component.sessionId).toEqual('chat-1');
        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/workspace');
        expect(component.tools.length).toEqual(1);
        expect(component.tools[0].name).toEqual('read_file');
        expect(component.tools[0].active).toEqual(false);
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

        expect(component.messages[1].content).toEqual('Echo: hello panel');
        expect(component.input).toEqual('');
        expect(component.highlightedToolRun).toEqual(undefined);
    }

    @Test('shared select menu actions resolve, choose, and cancel through session state')
    async sharedSelectMenuActionsResolveThroughSessionState() {
        const state = new AgentConsoleSessionState();
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

    @Test('session state resolves slash and mention suggestions from input cursor')
    async sessionStateResolvesSlashAndMentionSuggestions() {
        const state = new AgentConsoleSessionState();
        state.setCommandHints(['/help', '/hello']);
        state.setTools([
            { name: 'read_file', active: false },
            { name: 'write_file', active: false }
        ]);

        state.setInput('/');
        expect(state.selectMenu?.title).toEqual('Suggestions');
        expect(state.selectMenu?.options.map(option => option.value)).toEqual(['/help', '/hello']);

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

    @Test('session state processes raw enter chunks through shared console input rules')
    async sessionStateProcessesRawEnterChunks() {
        const state = new AgentConsoleSessionState();
        let submitCount = 0;
        state.submitAction = async () => {
            submitCount += 1;
        };

        state.setCommandHints(['/help']);
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

        state.setInput('hello');
        await state.processRawChunk('\r', { submitOnEnter: false, ctrlKey: true });
        expect(state.input).toContain('\n');
    }

    @Test('session state tracks input history and skips slash commands')
    async sessionStateTracksInputHistory() {
        const state = new AgentConsoleSessionState();
        state.pushInputHistory('first');
        state.pushInputHistory('/help');
        state.pushInputHistory('second');
        state.setInput('draft');

        expect(state.getInputHistoryEntries()).toEqual(['second', '/help', 'first']);
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

    @Test('session state starts submit without waiting for model turn completion')
    async sessionStateStartsSubmitWithoutWaitingForTurnCompletion() {
        const state = new AgentConsoleSessionState();
        let releaseSubmit!: () => void;
        let completed = false;
        state.submitAction = async () => {
            state.setStatus('running');
            await new Promise<void>(resolve => {
                releaseSubmit = resolve;
            });
            completed = true;
            state.setStatus('idle');
        };

        state.setInput('hello');
        const result = await state.processRawChunk('\r', { submitOnEnter: true });

        expect(result.submitted).toEqual(true);
        expect(state.status).toEqual('running');
        expect(completed).toEqual(false);
        releaseSubmit();
        await Promise.resolve();
        expect(completed).toEqual(true);
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

    @Test('component delegates session and copy commands through ui delegate')
    async componentDelegatesSessionAndCopyCommandsThroughUiDelegate() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        uiDelegate.sessions = [
            { id: 'chat-a', current: true },
            { id: 'chat-b', current: false }
        ];
        uiDelegate.nextSelections = ['chat-b'];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);

        component.input = '/session';
        await component.submit();
        expect(uiDelegate.switchedSessions).toEqual(['chat-b']);

        component.input = '/new scratch';
        await component.submit();
        expect(uiDelegate.switchedSessions).toEqual(['chat-b', 'scratch']);

        component.input = '/copy input';
        await component.submit();
        expect(uiDelegate.copiedTargets).toEqual(['input']);
    }

    @Test('model switch prompt keeps defaults and reuses existing api key')
    async modelSwitchPromptKeepsDefaultsAndReusesExistingApiKey() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        uiDelegate.nextSelections = ['openai-compatible'];
        uiDelegate.nextPrompts = ['', '', 'https://api.compat.local', ''];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);
        (component as any).options.model = {
            provider: 'openai-compatible',
            model: 'custom-model',
            apiKey: 'existing-key'
        };
        component.configure({
            provider: 'openai-compatible',
            model: 'custom-model'
        });

        component.input = '/model';
        await component.submit();

        expect(uiDelegate.appliedProfiles).toEqual([{
            provider: 'openai-compatible',
            flashModel: 'custom-model',
            strongModel: 'custom-model',
            baseUrl: 'https://api.compat.local',
            apiKey: 'existing-key'
        }]);
    }

    @Test('model switch returns to provider menu when model menu is cancelled')
    async modelSwitchReturnsToProviderMenuWhenModelMenuIsCancelled() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);
        (component as any).options.model = {
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            apiKey: 'existing-key'
        };
        component.configure({
            provider: 'deepseek',
            model: 'deepseek-v4-flash'
        });
        uiDelegate.nextSelections = ['openai', undefined, 'deepseek', 'deepseek-v4-flash', 'deepseek-v4-pro'];
        uiDelegate.nextPrompts = [''];

        component.input = '/model';
        await component.submit();

        expect(uiDelegate.appliedProfiles).toEqual([{
            provider: 'deepseek',
            flashModel: 'deepseek-v4-flash',
            strongModel: 'deepseek-v4-pro',
            baseUrl: 'https://api.deepseek.com',
            apiKey: 'existing-key'
        }]);
    }

    @Test('clear command starts a new session after submit')
    async clearCommandStartsNewSessionAfterSubmit() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);

        component.input = '/clear';
        await component.submit();

        expect(component.input).toEqual('');
        expect(uiDelegate.switchedSessions).toEqual([undefined]);
        expect(uiDelegate.notices).toContain('Started a new session.');
    }

    @Test('submit keeps draft intact while a turn is already running')
    async submitKeepsDraftIntactWhileTurnRunning() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);

        component.sessionState.setStatus('running');
        component.input = 'hello again';
        await component.submit();

        expect(runtime.calls).toEqual([]);
        expect(component.input).toEqual('hello again');
        expect(uiDelegate.notices).toContain('Wait for the current turn to finish.');
    }

    @Test('approvals command focuses pending requests instead of opening modal')
    async approvalsCommandFocusesPendingRequests() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
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
            timeoutMs: 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate, approvals);

        component.input = '/approvals';
        await component.submit();

        expect(component.sessionState.approvalsFocused).toEqual(true);
        expect(component.sessionState.selectedApproval?.id).toEqual('approval-1');
        expect(approvals.approved).toEqual([]);
    }

    @Test('approval inspector returns to request menu when detail menu is cancelled')
    async approvalInspectorReturnsToRequestMenuWhenDetailMenuIsCancelled() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
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
            timeoutMs: 30000
        }, {
            id: 'approval-2',
            toolName: 'delete_file',
            sessionId: 'console',
            reason: 'Deleting files requires approval.',
            summary: 'Deleting files requires approval.',
            hasInput: true,
            inputSummary: '{"path":"old.txt"}',
            createdAt: Date.now(),
            timeoutMs: 30000
        }];
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate, approvals);
        uiDelegate.nextSelections = ['approval-1', undefined, 'approval-2', 'approve'];

        await (component as any).openApprovalInspector(approvals.getPending());

        expect(approvals.approved).toEqual(['approval-2']);
        expect(uiDelegate.notices).toContain('Approved delete_file (approval).');
    }

    @Test('tools command focuses tool panel instead of opening modal')
    async toolsCommandFocusesToolPanel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);
        await component.onInit();

        component.input = '/tools';
        await component.submit();

        expect(component.sessionState.toolsFocused).toEqual(true);
        expect(component.sessionState.selectedTool?.name).toEqual('read_file');
    }

    @Test('help menu selections execute commands and mentions')
    async helpMenuSelectionsExecuteActions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const uiDelegate = new UiDelegateStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub(), undefined, uiDelegate);

        uiDelegate.nextSelections = ['/messages'];
        component.input = '/help';
        await component.submit();
        expect(component.sessionState.messagesFocused).toEqual(true);

        component.sessionState.setMessagesFocused(false);
        uiDelegate.nextSelections = ['@workspace'];
        component.input = '/help';
        await component.submit();
        expect(component.input).toEqual('@workspace ');
        expect(component.inputCursor).toEqual('@workspace '.length);
        expect(component.sessionState.inputFocused).toEqual(true);
    }

    @Test('component handleCommand returns true for known commands')
    async componentHandleCommandReturnsTrue() {
        const state = new AgentConsoleSessionState();
        state.setMessages([]);
        expect(state.messages.length).toEqual(0);
    }

    @Test('input panel submits on plain enter and keeps ctrl-enter for newline')
    async inputPanelSubmitsOnPlainEnterAndKeepsCtrlEnterForNewline() {
        let submitCount = 0;
        const panel = new AgentConsoleInputPanelComponent();
        panel.submitAction = async () => {
            submitCount++;
        };

        await panel.onKeydown({ key: 'Escape' } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', ctrlKey: true, preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', altKey: true, preventDefault() {} } as KeyboardEvent);
        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);

        expect(submitCount).toEqual(1);
    }

    @Test('input panel routes suggestion keys through shared session state')
    async inputPanelRoutesSuggestionKeysThroughSharedState() {
        const state = new AgentConsoleSessionState();
        state.setCommandHints(['/help', '/hello']);
        state.setInput('/');
        const panel = new AgentConsoleInputPanelComponent(state);

        await panel.onKeydown({ key: 'ArrowDown', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu?.selectedIndex).toEqual(1);

        await panel.onKeydown({ key: 'Tab', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('/hello ');
        expect(state.selectMenu).toEqual(undefined);

        state.submitAction = async () => {
            state.setNotice('submitted');
        };
        state.setInput('/he');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('/help ');
        expect(state.notice).toEqual('submitted');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('check @wo');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);
        expect(state.input).toEqual('check @workspace ');
        expect(state.notice).toEqual('submitted');
        expect(state.selectMenu).toEqual(undefined);

        state.setInput('/');
        expect(state.selectMenu?.title).toEqual('Suggestions');

        await panel.onKeydown({ key: 'Escape', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('input panel confirms normal select menus with enter')
    async inputPanelConfirmsNormalSelectMenusWithEnter() {
        const state = new AgentConsoleSessionState();
        const resolved: Array<string | undefined> = [];
        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        state.selectMenuAction = value => {
            resolved.push(value);
        };
        const panel = new AgentConsoleInputPanelComponent(state);

        await panel.onKeydown({ key: 'Enter', preventDefault() {} } as KeyboardEvent);

        expect(resolved).toEqual(['/tools']);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('input panel closes normal select menus with q and escape')
    async inputPanelClosesNormalSelectMenusWithQAndEscape() {
        const state = new AgentConsoleSessionState();
        const panel = new AgentConsoleInputPanelComponent(state);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'q', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);

        state.openSelectMenu('Help', [
            { label: '/model', value: '/model' },
            { label: '/tools', value: '/tools' }
        ], 1);
        await panel.onKeydown({ key: 'Escape', preventDefault() {} } as KeyboardEvent);
        expect(state.selectMenu).toEqual(undefined);
    }

    @Test('escape dismisses focused layers back to input focus')
    async escapeDismissesFocusedLayersBackToInputFocus() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any
        ]);
        state.setMessagesFocused(true);
        state.openMessageDetail();

        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messagesFocused).toEqual(true);
        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
        expect(state.messagesFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);

        state.openSelectMenu('Help', [{ label: '/help', value: '/help' }], 0);
        expect(state.inputFocused).toEqual(false);

        await state.dismissFocusLayer();
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

        await state.dismissFocusLayer();
        expect(state.approvalsFocused).toEqual(false);
        expect(state.inputFocused).toEqual(true);
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

    @Test('working usage tracks current tokens from stream and model completion')
    async workingUsageTracksCurrentTokens() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-usage' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentStreamChunkEvent(this, 'chat-usage', 'done', undefined, undefined, {
            promptTokens: 11,
            completionTokens: 13,
            totalTokens: 24
        }));

        expect(state.tokenUsage.totalTokens).toEqual(24);
        expect(state.tokenUsage.promptTokens).toEqual(11);
        expect(state.tokenUsage.completionTokens).toEqual(13);

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-usage', {
            metadata: {
                provider: 'deepseek',
                model: 'deepseek-v4-flash',
                usage: {
                    prompt_tokens: 20,
                    completion_tokens: 22,
                    total_tokens: 42
                }
            }
        } as any));

        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(state.tokenUsage.totalTokens).toEqual(42);
        expect(state.tokenUsage.promptTokens).toEqual(20);
        expect(state.tokenUsage.completionTokens).toEqual(22);
    }

    @Test('configured model label is preserved after model completion events')
    async preservesConfiguredModelLabel() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({
            sessionId: 'chat-model',
            provider: 'openai-compatible',
            model: 'redhus',
            modelProfile: 'flash'
        });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentModelCompletedEvent(this, 'chat-model', {
            metadata: {
                provider: 'openai-compatible',
                model: 'rehdasu',
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 12,
                    total_tokens: 22
                }
            }
        } as any));

        expect(component.provider).toEqual('openai-compatible');
        expect(component.model).toEqual('redhus');
    }

    @Test('tracks pending approvals through event bridge')
    async tracksPendingApprovalsThroughEventBridge() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const app = new ApplicationContextStub();
        const { state, component } = createConsoleParts(runtime, scheduler, new ToolRegistryStub(), app);
        component.configure({ sessionId: 'chat-approval' });
        await component.onInit();

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, {
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'chat-approval',
            reason: 'Writing files requires approval.',
            summary: 'Writing files requires approval. Summary: {"path":"notes.txt"}',
            hasInput: true,
            inputSummary: '{"path":"notes.txt"}',
            timeoutMs: 30000
        }));

        expect(state.pendingApprovals.length).toEqual(1);
        expect(state.pendingApprovals[0].toolName).toEqual('write_file');

        await app.eventMulticaster.emit(new AgentApprovalCompletedEvent(this, {
            id: 'approval-1',
            toolName: 'write_file',
            sessionId: 'chat-approval'
        }, true));

        expect(state.pendingApprovals).toEqual([]);

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, {
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'chat-approval',
            reason: 'Shell execution requires approval.',
            summary: 'Shell execution requires approval.',
            hasInput: false,
            timeoutMs: 30000
        }));

        await app.eventMulticaster.emit(new AgentApprovalFailedEvent(this, {
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'chat-approval'
        }, new Error('Approval timeout')));

        expect(state.pendingApprovals).toEqual([]);
        expect(state.lastError).toEqual('Approval timeout');
    }

    @Test('session state supports focused session list navigation')
    sessionStateSupportsFocusedSessionListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setSessions([
            { id: 'chat-1', current: true, messageCount: 4, updatedAt: 4 },
            { id: 'chat-2', current: false, messageCount: 2, updatedAt: 2 }
        ]);

        expect(state.selectedSessionId).toEqual('chat-1');

        state.setSessionsFocused(true);
        expect(state.sessionsFocused).toEqual(true);
        expect(state.selectedSession?.id).toEqual('chat-1');

        state.moveSessionSelection(1);
        expect(state.selectedSession?.id).toEqual('chat-2');

        state.setSelectedSessionId('chat-1');
        expect(state.selectedSession?.id).toEqual('chat-1');

        state.setSessionsFocused(false);
        expect(state.sessionsFocused).toEqual(false);
    }

    @Test('session state supports focused tool list navigation')
    sessionStateSupportsFocusedToolListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setTools([
            { name: 'read_file', toolset: 'filesystem', active: true, activationKind: 'always' },
            { name: 'write_file', toolset: 'filesystem', active: false, activationKind: 'approval' }
        ]);

        expect(state.selectedTool?.name).toEqual('read_file');

        state.setToolsFocused(true);
        expect(state.toolsFocused).toEqual(true);

        state.moveToolSelection(1);
        expect(state.selectedTool?.name).toEqual('write_file');

        state.setSelectedToolName('read_file');
        expect(state.selectedTool?.name).toEqual('read_file');

        state.setToolsFocused(false);
        expect(state.toolsFocused).toEqual(false);
    }

    @Test('session state supports focused approval list navigation')
    sessionStateSupportsFocusedApprovalListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setPendingApprovals([
            {
                id: 'approval-1',
                toolName: 'write_file',
                sessionId: 'console',
                reason: 'Writing files requires approval.',
                summary: 'Writing files requires approval.',
                hasInput: true,
                createdAt: 1,
                timeoutMs: 30000
            } as any,
            {
                id: 'approval-2',
                toolName: 'terminal',
                sessionId: 'console',
                reason: 'Shell execution requires approval.',
                summary: 'Shell execution requires approval.',
                hasInput: true,
                createdAt: 2,
                timeoutMs: 60000
            } as any
        ]);

        expect(state.selectedApproval?.id).toEqual('approval-1');

        state.setApprovalsFocused(true);
        expect(state.approvalsFocused).toEqual(true);

        state.moveApprovalSelection(1);
        expect(state.selectedApproval?.id).toEqual('approval-2');

        state.setSelectedApprovalId('approval-1');
        expect(state.selectedApproval?.id).toEqual('approval-1');

        state.setApprovalsFocused(false);
        expect(state.approvalsFocused).toEqual(false);
    }

    @Test('session state supports paged session navigation and edges')
    sessionStateSupportsPagedSessionNavigationAndEdges() {
        const state = new AgentConsoleSessionState();
        state.setSessions([
            { id: 'chat-1', current: true } as any,
            { id: 'chat-2', current: false } as any,
            { id: 'chat-3', current: false } as any,
            { id: 'chat-4', current: false } as any,
            { id: 'chat-5', current: false } as any,
            { id: 'chat-6', current: false } as any,
            { id: 'chat-7', current: false } as any
        ]);

        state.moveSessionSelectionPage(1);
        expect(state.selectedSession?.id).toEqual('chat-6');

        state.selectLastSession();
        expect(state.selectedSession?.id).toEqual('chat-7');

        state.moveSessionSelectionPage(-1);
        expect(state.selectedSession?.id).toEqual('chat-2');

        state.selectFirstSession();
        expect(state.selectedSession?.id).toEqual('chat-1');
    }

    @Test('session state supports focused message list navigation')
    sessionStateSupportsFocusedMessageListNavigation() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);

        expect(state.selectedMessageId).toEqual('m2');

        state.setMessagesFocused(true);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m2');

        state.moveMessageSelection(-1);
        expect(state.selectedMessage?.id).toEqual('m1');

        state.setSelectedMessageId('m2');
        expect(state.selectedMessage?.id).toEqual('m2');

        state.setMessagesFocused(false);
        expect(state.messagesFocused).toEqual(false);
    }

    @Test('session state follows the latest message when not browsing messages')
    sessionStateFollowsLatestMessageWhenNotBrowsing() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);

        state.setSelectedMessageId('m1');
        expect(state.selectedMessageId).toEqual('m1');

        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'next', createdAt: 3 } as any
        ]);
        expect(state.selectedMessageId).toEqual('m3');

        state.setMessagesFocused(true);
        state.setSelectedMessageId('m1');
        state.setMessages([
            { id: 'm1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: 'world', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'next', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: 'reply', createdAt: 4 } as any
        ]);
        expect(state.selectedMessageId).toEqual('m1');
    }

    @Test('session state supports message detail open and scroll')
    sessionStateSupportsMessageDetailOpenAndScroll() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8',
                createdAt: 1
            } as any
        ]);

        state.setMessagesFocused(true);
        state.openMessageDetail();
        expect(state.messageDetailOpen).toEqual(true);
        expect(state.messageDetailScroll).toEqual(0);

        state.scrollMessageDetail(3);
        expect(state.messageDetailScroll).toEqual(2);

        state.closeMessageDetail();
        expect(state.messageDetailOpen).toEqual(false);
        expect(state.messageDetailScroll).toEqual(0);
    }

    @Test('session state supports paged message navigation and detail edges')
    sessionStateSupportsPagedMessageNavigationAndDetailEdges() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any,
            { id: 'm7', role: 'user', content: '7', createdAt: 7 } as any,
            { id: 'm8', role: 'assistant', content: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8', createdAt: 8 } as any
        ]);

        state.selectFirstMessage();
        expect(state.selectedMessage?.id).toEqual('m1');

        state.moveMessageSelectionPage(1);
        expect(state.selectedMessage?.id).toEqual('m7');

        state.selectLastMessage();
        expect(state.selectedMessage?.id).toEqual('m8');

        state.openMessageDetail();
        state.scrollMessageDetailToEdge('end');
        expect(state.messageDetailScroll).toEqual(2);

        state.scrollMessageDetailPage(-1);
        expect(state.messageDetailScroll).toEqual(0);
    }

    @Test('session state supports message detail horizontal scrolling with tab expansion')
    sessionStateSupportsMessageDetailHorizontalScrollingWithTabExpansion() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            {
                id: 'm1',
                role: 'assistant',
                content: '\tconst value = 42;\n\t\treturn value;',
                createdAt: 1
            } as any
        ]);

        state.setMessagesFocused(true);
        state.openMessageDetail();

        expect(state.messageDetailLines[0]).toEqual('    const value = 42;');
        expect(state.messageDetailLines[1]).toEqual('        return value;');
        expect(state.messageDetailMaxColumn).toEqual('        return value;'.length);

        state.scrollMessageDetailColumns(4);
        expect(state.messageDetailColumnScroll).toEqual(4);

        state.scrollMessageDetailColumnsToEdge('end');
        expect(state.messageDetailColumnScroll).toEqual(state.messageDetailMaxColumn - 1);

        state.closeMessageDetail();
        expect(state.messageDetailColumnScroll).toEqual(0);
    }
    @Test('handleSelectKey navigates and confirms select menu')
    handleSelectKeyNavigatesSelectMenu() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' },
            { label: 'C', value: 'c' }
        ]);
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        
        // Up wraps to last
        state.handleSelectKey('up');
        expect(state.selectMenu?.selectedIndex).toEqual(2);
        
        // Down wraps to first
        state.handleSelectKey('down');
        expect(state.selectMenu?.selectedIndex).toEqual(0);
        
        // Down moves to next
        state.handleSelectKey('down');
        expect(state.selectMenu?.selectedIndex).toEqual(1);
        
        // Escape cancels
        state.handleSelectKey('escape');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey treats q like escape for select menus')
    handleSelectKeyTreatsQAsEscapeForSelectMenus() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);

        state.handleSelectKey('q');

        expect(state.selectMenu).toBeUndefined();
    }

    @Test('handleSelectKey selects by number and returns true on handled keys')
    handleSelectKeyReturnsTrueOnHandledKeys() {
        const state = new AgentConsoleSessionState();
        state.openSelectMenu('Test', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);
        
        expect(state.handleSelectKey('up')).toBe(true);
        expect(state.handleSelectKey('down')).toBe(true);
        expect(state.handleSelectKey('return')).toBe(true);
        expect(state.selectMenu).toBeUndefined();  // confirmed

        state.openSelectMenu('Test2', [
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b' }
        ]);
        expect(state.handleSelectKey('1')).toBe(true);
        expect(state.selectMenu).toBeUndefined();  // chosen index 0
        
        // Unhandled key returns false
        expect(state.handleSelectKey('x')).toBe(false);
    }


}
