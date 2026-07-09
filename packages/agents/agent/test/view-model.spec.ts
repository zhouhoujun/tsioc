import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent } from '../src/ui/AgentConsoleComponent';
import { AgentConsoleEventBridge } from '../src/ui/AgentConsoleEventBridge';
import { AgentConsoleInputPanelComponent } from '../src/ui/AgentConsolePanels';
import { AgentConsoleSessionState } from '../src/ui/AgentConsoleSessionState';
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

function createConsoleParts(runtime: RuntimeStub, scheduler: SchedulerStub, toolRegistry?: ToolRegistryStub, app?: ApplicationContextStub) {
    const state = new AgentConsoleSessionState();
    const bridge = new AgentConsoleEventBridge(state, runtime as any, toolRegistry as any, app as any);
    const component = new AgentConsoleComponent(
        state,
        runtime as any,
        scheduler as any,
        bridge,
        { ui: { title: 'Console' } } as any,
        toolRegistry as any
    );
    return { state, bridge, component };
}

function createConsole(runtime: RuntimeStub, scheduler: SchedulerStub, toolRegistry?: ToolRegistryStub, app?: ApplicationContextStub): AgentConsoleComponent {
    return createConsoleParts(runtime, scheduler, toolRegistry, app).component;
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

    @Test('component runs registered command actions')
    async componentRunsRegisteredCommandActions() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        const calls: string[] = [];

        component.setCommandAction('/model', async () => {
            calls.push('/model');
        });

        await expect(component.runCommand('/model')).resolves.toEqual(true);
        await expect(component.runCommand('/unknown')).resolves.toEqual(false);
        expect(calls).toEqual(['/model']);
    }

    @Test('component replaces command action registration by command key')
    async componentReplacesCommandActionRegistration() {
        const runtime = new RuntimeStub();
        const scheduler = new SchedulerStub();
        const component = createConsole(runtime, scheduler, new ToolRegistryStub());
        const calls: string[] = [];

        component.setCommandAction('/tools', async () => {
            calls.push('first');
        });
        component.setCommandAction('/tools', async () => {
            calls.push('second');
        });

        await expect(component.runCommand('/tools')).resolves.toEqual(true);
        expect(calls).toEqual(['second']);
    }

    @Test('input panel submits on enter key')
    async inputPanelSubmitsOnEnterKey() {
        let submitCount = 0;
        const panel = new AgentConsoleInputPanelComponent();
        panel.submitAction = async () => {
            submitCount++;
        };

        await panel.onKeyup({ key: 'Escape' } as KeyboardEvent);
        await panel.onKeyup({ key: 'Enter' } as KeyboardEvent);

        expect(submitCount).toEqual(1);
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
}
