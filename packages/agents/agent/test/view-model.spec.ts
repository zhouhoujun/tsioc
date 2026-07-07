import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent } from '../src/ui/AgentConsoleComponent';
import { AgentConsoleEventBridge } from '../src/ui/AgentConsoleEventBridge';
import { AgentConsoleInputPanelComponent } from '../src/ui/AgentConsolePanels';
import { AgentConsoleSessionState } from '../src/ui/AgentConsoleSessionState';
import {
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

        expect(component.provider).toEqual('deepseek');
        expect(component.model).toEqual('deepseek-v4-flash');
        expect(component.workspace).toEqual('/tmp/workspace');
        expect(component.tools.length).toEqual(1);
        expect(component.messages.length).toBeGreaterThan(0);
        expect(component.activities.length).toEqual(0);
        expect(component.notice).toEqual('');
        expect(component.selectMenu).toEqual(undefined);

        state.setNotice('Switch model');
        state.openSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai' }
        ], 1);
        expect(component.notice).toEqual('Switch model');
        expect(component.selectMenu?.selectedIndex).toEqual(1);
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
}
