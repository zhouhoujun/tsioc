import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { AgentTurnCancelledError } from '../src/runtime/AgentTurnCancelledError';
import { AgentApprovalFailedEvent, AgentCompensationEvent, AgentErrorEvent, AgentTurnCancelledEvent, AgentTurnCompletedEvent } from '../src/runtime/AgentEvents';
import { ToolApprovalManager } from '../src/tools/ToolApprovalManager';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

class EmptyToolRegistry extends ToolRegistry {
    getTools() { return []; }
    getTool() { return undefined; }
    async invoke(): Promise<any> { return null; }
}

class AbortAwareBlockingModelAdapter extends EchoModelAdapter {
    requests: any[] = [];

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        await new Promise<void>((resolve, reject) => {
            if (request.signal?.aborted) {
                reject(new Error('The operation was aborted.'));
                return;
            }
            request.signal?.addEventListener('abort', () => {
                reject(new Error('The operation was aborted.'));
            });
        });
        return { message: 'done', stopReason: 'end' };
    }
}

class AbortAwareBlockingStreamingModelAdapter extends EchoModelAdapter {
    requests: any[] = [];

    async *stream(request: any): AsyncGenerator<any> {
        this.requests.push(request);
        await new Promise<void>((resolve, reject) => {
            if (request.signal?.aborted) {
                reject(new Error('The operation was aborted.'));
                return;
            }
            request.signal?.addEventListener('abort', () => {
                reject(new Error('The operation was aborted.'));
            });
        });
        yield { type: 'text', content: 'never' };
    }
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const startedAt = Date.now();
    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error('waitFor timed out');
        }
        await new Promise(resolve => setTimeout(resolve, 5));
    }
}

async function waitForState(predicate: () => Promise<boolean>, timeoutMs = 3000): Promise<void> {
    const startedAt = Date.now();
    for (;;) {
        if (await predicate()) {
            return;
        }
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error('waitForState timed out');
        }
        await new Promise(resolve => setTimeout(resolve, 5));
    }
}

@Suite('Agent turn cancellation')
export class TurnCancellationTest {
    @Test('cancelTurn returns true for a running turn and the turn rejects with AgentTurnCancelledError')
    async cancelRunningTurn() {
        const adapter = new AbortAwareBlockingModelAdapter();
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            adapter,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        const turn = runtime.runTurn('s1', 'hello');
        await waitFor(() => adapter.requests.length > 0);

        const cancelled = await runtime.cancelTurn('s1');
        expect(cancelled).toEqual({ cancelled: true, compensated: 0, toolCallIds: [] });

        let error: any;
        try {
            await turn;
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(AgentTurnCancelledError);
        expect((error as AgentTurnCancelledError).sessionId).toEqual('s1');

        const cancelledEvent = app.events.find(event => event instanceof AgentTurnCancelledEvent) as AgentTurnCancelledEvent | undefined;
        expect(cancelledEvent?.sessionId).toEqual('s1');
        expect(app.events.some(event => event instanceof AgentErrorEvent)).toEqual(false);
        expect(app.events.some(event => event instanceof AgentTurnCompletedEvent)).toEqual(false);
    }

    @Test('cancelTurn returns false when no turn is running')
    async cancelWithoutRunningTurn() {
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const cancelled = await runtime.cancelTurn('s1');
        expect(cancelled).toEqual({ cancelled: false, compensated: 0, toolCallIds: [] });

        // a second cancel after an active cancel also reports false
        const adapter = new AbortAwareBlockingModelAdapter();
        const app = new FakeApp();
        const cancelRuntime = new DefaultAgentRuntime(
            adapter,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        const turn = cancelRuntime.runTurn('s1', 'hello');
        await waitFor(() => adapter.requests.length > 0);
        expect(await cancelRuntime.cancelTurn('s1')).toEqual({ cancelled: true, compensated: 0, toolCallIds: [] });
        expect(await cancelRuntime.cancelTurn('s1')).toEqual({ cancelled: false, compensated: 0, toolCallIds: [] });
        await turn.catch(() => undefined);
    }

    @Test('cancelling a streaming turn rejects with AgentTurnCancelledError and publishes cancelled event')
    async cancelStreamingTurn() {
        const adapter = new AbortAwareBlockingStreamingModelAdapter();
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            adapter,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        const chunks: any[] = [];
        const turn = (async () => {
            for await (const chunk of runtime.runStreamingTurn('s1', 'hello')) {
                chunks.push(chunk);
            }
        })();
        await waitFor(() => adapter.requests.length > 0);

        const cancelled = await runtime.cancelTurn('s1');
        expect(cancelled).toEqual({ cancelled: true, compensated: 0, toolCallIds: [] });

        let error: any;
        try {
            await turn;
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(AgentTurnCancelledError);
        expect((error as AgentTurnCancelledError).sessionId).toEqual('s1');

        const cancelledEvent = app.events.find(event => event instanceof AgentTurnCancelledEvent) as AgentTurnCancelledEvent | undefined;
        expect(cancelledEvent?.sessionId).toEqual('s1');
        expect(app.events.some(event => event instanceof AgentErrorEvent)).toEqual(false);
        expect(app.events.some(event => event instanceof AgentTurnCompletedEvent)).toEqual(false);
    }

    @Test('cancelTurn cascades cancellation to registered child sessions')
    async cancelTurnCascadesToChildSessions() {
        const app = new FakeApp();
        const adapter = new AbortAwareBlockingModelAdapter();
        const runtime = new DefaultAgentRuntime(
            adapter,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        runtime.registerChildSession('parent-1', 'child-1');

        let parentError: any;
        let childError: any;
        const parentTurn = runtime.runTurn('parent-1', 'hello').catch(err => { parentError = err; });
        await waitFor(() => adapter.requests.filter(r => r.sessionId === 'parent-1').length > 0);
        const childTurn = runtime.runTurn('child-1', 'work').catch(err => { childError = err; });
        await waitFor(() => adapter.requests.filter(r => r.sessionId === 'child-1').length > 0);

        const cancelled = await runtime.cancelTurn('parent-1');
        expect(cancelled).toEqual({ cancelled: true, compensated: 0, toolCallIds: [] });

        await parentTurn;
        expect(parentError).toBeInstanceOf(AgentTurnCancelledError);

        await childTurn;
        expect(childError).toBeInstanceOf(AgentTurnCancelledError);
        expect((childError as AgentTurnCancelledError).sessionId).toEqual('child-1');
    }

    @Test('unregisterChildSession removes cascade link')
    async unregisterChildSessionRemovesLink() {
        const app = new FakeApp();
        // child-1 completes immediately (not linked), parent and child-2 block.
        const adapter = new SelectiveBlockingModelAdapter(['parent-1', 'child-2']);
        const runtime = new DefaultAgentRuntime(
            adapter,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        runtime.registerChildSession('parent-1', 'child-1');
        runtime.registerChildSession('parent-1', 'child-2');
        runtime.unregisterChildSession('parent-1', 'child-1');

        let parentError: any;
        let childOneError: any;
        let childTwoError: any;
        const parentTurn = runtime.runTurn('parent-1', 'hello').catch(err => { parentError = err; });
        await waitFor(() => adapter.requests.filter(r => r.sessionId === 'parent-1').length > 0);
        const childOneTurn = runtime.runTurn('child-1', 'work').catch(err => { childOneError = err; });
        const childTwoTurn = runtime.runTurn('child-2', 'work').catch(err => { childTwoError = err; });
        await waitFor(() => adapter.requests.filter(r => r.sessionId === 'child-2').length > 0);

        await runtime.cancelTurn('parent-1');

        await parentTurn;
        expect(parentError).toBeInstanceOf(AgentTurnCancelledError);

        // child-1 was unregistered, so it completes normally and is not cancelled.
        await childOneTurn;
        expect(childOneError).toBeUndefined();

        // child-2 was still linked and must have been aborted by the parent.
        await childTwoTurn;
        expect(childTwoError).toBeInstanceOf(AgentTurnCancelledError);
    }

    @Test('registerChildSession annotates the child as a worker linked to the parent thread')
    async registerChildSessionAnnotatesWorker() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        await store.setProjectMetadata('parent-1', { primaryThreadId: 'thread-p', sessionRole: 'main' });
        runtime.registerChildSession('parent-1', 'child-1', { goal: 'analyze project' });

        await waitForState(async () => (await store.get('child-1')).sessionRole === 'worker');
        const child = await store.get('child-1');
        expect(child.originThreadId).toEqual('thread-p');
        expect(child.focusSummary).toEqual('analyze project');
    }

    @Test('registerChildSession links the child to the parent session when the parent has no thread')
    async registerChildSessionFallsBackToParentSessionId() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        runtime.registerChildSession('parent-1', 'child-1');

        await waitForState(async () => (await store.get('child-1')).sessionRole === 'worker');
        const child = await store.get('child-1');
        expect(child.originThreadId).toEqual('parent-1');
        expect(child.focusSummary).toBeUndefined();
    }

    @Test('registerChildSession preserves a child with an explicit non-worker role')
    async registerChildSessionPreservesExplicitChildMetadata() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        await store.setProjectMetadata('child-1', {
            projectId: 'proj-a',
            primaryThreadId: 'thread-c',
            sessionRole: 'main',
            rootRequest: 'explicit root',
            focusSummary: 'explicit focus'
        });
        runtime.registerChildSession('parent-1', 'child-1', { goal: 'ignored' });

        await new Promise(resolve => setTimeout(resolve, 20));
        const child = await store.get('child-1');
        expect(child.sessionRole).toEqual('main');
        expect(child.projectId).toEqual('proj-a');
        expect(child.primaryThreadId).toEqual('thread-c');
        expect(child.rootRequest).toEqual('explicit root');
        expect(child.focusSummary).toEqual('explicit focus');
        expect(child.originThreadId).toBeUndefined();
    }

    @Test('registerChildSession fills the origin thread for an existing worker-role child')
    async registerChildSessionKeepsWorkerFieldsAndFillsOrigin() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        await store.setProjectMetadata('child-1', { sessionRole: 'worker', projectId: 'proj-a', focusSummary: 'mine' });
        runtime.registerChildSession('parent-1', 'child-1', { goal: 'ignored' });

        await waitForState(async () => (await store.get('child-1')).originThreadId !== undefined);
        const child = await store.get('child-1');
        expect(child.sessionRole).toEqual('worker');
        expect(child.originThreadId).toEqual('parent-1');
        expect(child.projectId).toEqual('proj-a');
        expect(child.focusSummary).toEqual('mine');
    }

    @Test('unregisterChildSession marks the worker thread completed by default')
    async unregisterChildSessionMarksThreadCompleted() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        await store.setProjectMetadata('parent-1', { primaryThreadId: 'thread-p', sessionRole: 'main' });
        runtime.registerChildSession('parent-1', 'child-1', { goal: 'polish ui' });
        await waitForState(async () => (await store.get('child-1')).sessionRole === 'worker');

        runtime.unregisterChildSession('parent-1', 'child-1');

        await waitForState(async () => (await store.get('child-1')).threadStatus === 'completed');
        const child = await store.get('child-1');
        expect(child.sessionRole).toEqual('worker');
        expect(child.originThreadId).toEqual('thread-p');
        expect(child.threadStatus).toEqual('completed');
    }

    @Test('unregisterChildSession maps a failed edge to a blocked worker thread')
    async unregisterChildSessionMapsFailureToBlocked() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        runtime.registerChildSession('parent-1', 'child-1');
        await waitForState(async () => (await store.get('child-1')).sessionRole === 'worker');

        runtime.unregisterChildSession('parent-1', 'child-1', 'failed');

        await waitForState(async () => (await store.get('child-1')).threadStatus === 'blocked');
        expect((await store.get('child-1')).threadStatus).toEqual('blocked');
    }

    @Test('unregisterChildSession maps a cancelled edge to an abandoned worker thread')
    async unregisterChildSessionMapsCancelledToAbandoned() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        runtime.registerChildSession('parent-1', 'child-1');
        await waitForState(async () => (await store.get('child-1')).sessionRole === 'worker');

        runtime.unregisterChildSession('parent-1', 'child-1', 'cancelled');

        await waitForState(async () => (await store.get('child-1')).threadStatus === 'abandoned');
        expect((await store.get('child-1')).threadStatus).toEqual('abandoned');
    }

    @Test('unregisterChildSession preserves an explicit terminal thread status')
    async unregisterChildSessionPreservesExplicitThreadStatus() {
        const app = new FakeApp();
        const store = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            store,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );
        await store.setProjectMetadata('child-1', { sessionRole: 'worker', threadStatus: 'completed' });
        runtime.registerChildSession('parent-1', 'child-1');
        await waitForState(async () => (await store.get('child-1')).originThreadId !== undefined);

        runtime.unregisterChildSession('parent-1', 'child-1', 'failed');

        await new Promise(resolve => setTimeout(resolve, 20));
        const child = await store.get('child-1');
        expect(child.threadStatus).toEqual('completed');
        expect(child.sessionRole).toEqual('worker');
    }

    @Test('cancelTurn drops pending approval requests for the session')
    async cancelTurnDropsPendingApprovals() {
        const app = new FakeApp();
        const approvalManager = new ToolApprovalManager(
            app as any,
            { requires: () => true, reason: () => 'approval required' } as any,
            { defaultTimeoutMs: 60000 }
        );
        const runtime = new DefaultAgentRuntime(
            new ToolCallingModelAdapter('sensitive_tool'),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any,
            undefined,
            undefined,
            approvalManager as any
        );

        const turn = runtime.runTurn('s1', 'do it');
        await waitFor(() => approvalManager.getPending().length > 0);

        expect(approvalManager.getPending().some(r => r.sessionId === 's1')).toEqual(true);

        const cancelled = await runtime.cancelTurn('s1');
        expect(cancelled).toEqual({ cancelled: true, compensated: 0, toolCallIds: [] });

        expect(approvalManager.getPending().filter(r => r.sessionId === 's1')).toEqual([]);
        const failedEvent = app.events.find(event => event instanceof AgentApprovalFailedEvent) as AgentApprovalFailedEvent | undefined;
        expect(failedEvent?.request.sessionId).toEqual('s1');

        let error: any;
        try {
            await turn;
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(AgentTurnCancelledError);
    }

    @Test('cancelling a turn rolls back successful side-effecting tool calls with the captured snapshot')
    async cancelTurnRollsBackToolSideEffects() {
        const tool = new ReversiblePutTool();
        const adapter = new ToolThenBlockModelAdapter('reversible_put', 'block');
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            adapter,
            new SingleToolRegistry(tool),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        const turn = runtime.runTurn('s1', 'store it');
        await waitFor(() => adapter.requests.length >= 2);

        const cancelled = await runtime.cancelTurn('s1');
        expect(cancelled).toEqual({ cancelled: true, compensated: 1, toolCallIds: ['tc-1'] });

        let error: any;
        try {
            await turn;
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(AgentTurnCancelledError);

        expect(tool.captured.length).toEqual(1);
        expect(tool.compensated.length).toEqual(1);
        expect(tool.compensated[0]).toEqual({
            ...tool.captured[0],
            existingIds: ['pre-existing-id']
        });

        const compensationEvent = app.events.find(event => event instanceof AgentCompensationEvent) as AgentCompensationEvent | undefined;
        expect(compensationEvent?.sessionId).toEqual('s1');
        expect(compensationEvent?.reason).toEqual('cancelled');
        expect(compensationEvent?.compensated).toEqual(1);
        expect(compensationEvent?.toolCallIds).toEqual(['tc-1']);
    }

    @Test('a failing turn rolls back successful side-effecting tool calls before publishing AgentErrorEvent')
    async failingTurnRollsBackToolSideEffects() {
        const tool = new ReversiblePutTool();
        const adapter = new ToolThenBlockModelAdapter('reversible_put', 'error');
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            adapter,
            new SingleToolRegistry(tool),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        let error: any;
        try {
            await runtime.runTurn('s1', 'store it');
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(Error);
        expect(error?.message).toEqual('model exploded');
        expect(app.events.some(event => event instanceof AgentErrorEvent)).toEqual(true);

        expect(tool.compensated.length).toEqual(1);
        expect(tool.compensated[0].existingIds).toEqual(['pre-existing-id']);

        const compensationEvent = app.events.find(event => event instanceof AgentCompensationEvent) as AgentCompensationEvent | undefined;
        expect(compensationEvent?.reason).toEqual('error');
        expect(compensationEvent?.compensated).toEqual(1);
        expect(compensationEvent?.toolCallIds).toEqual(['tc-1']);
    }

    @Test('rollback compensates successful tool calls in reverse order')
    async rollbackRunsInReverseOrder() {
        const orderLog: string[] = [];
        const toolA = new ReversiblePutTool('reversible_a', orderLog);
        const toolB = new ReversiblePutTool('reversible_b', orderLog);
        const adapter = new SequentialTwoToolModelAdapter('reversible_a', 'reversible_b');
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            adapter,
            new MultiToolRegistry([toolA, toolB]),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        let error: any;
        try {
            await runtime.runTurn('s1', 'store it');
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(Error);
        expect(toolA.captured.length).toEqual(1);
        expect(toolB.captured.length).toEqual(1);
        expect(toolA.compensated.length).toEqual(1);
        expect(toolB.compensated.length).toEqual(1);

        // the second call was compensated first (LIFO over the turn)
        expect(orderLog).toEqual(['reversible_b', 'reversible_a']);
    }
}

class ToolCallingModelAdapter extends EchoModelAdapter {
    constructor(private toolName: string) {
        super();
    }

    async complete(): Promise<any> {
        return {
            message: '',
            stopReason: 'tool_use',
            toolCalls: [{ id: 'tc-1', name: this.toolName, input: {} }]
        };
    }
}

/**
 * Blocks model requests only for the given session IDs (until aborted) and
 * completes immediately for every other session.
 */
class SelectiveBlockingModelAdapter extends EchoModelAdapter {
    requests: Array<{ sessionId: string; signal?: AbortSignal }> = [];

    constructor(private blockedSessions: string[]) {
        super();
    }

    async complete(request: any): Promise<any> {
        this.requests.push({ sessionId: request.sessionId, signal: request.signal });
        if (!this.blockedSessions.includes(request.sessionId)) {
            return { message: 'done', stopReason: 'end' };
        }
        await new Promise<void>((resolve, reject) => {
            if (request.signal?.aborted) {
                reject(new Error('The operation was aborted.'));
                return;
            }
            request.signal?.addEventListener('abort', () => {
                reject(new Error('The operation was aborted.'));
            });
        });
        return { message: 'done', stopReason: 'end' };
    }
}

class EchoToolRegistry extends ToolRegistry {
    private tools: any[];

    constructor() {
        super();
        this.tools = [{
            name: 'sensitive_tool',
            description: 'sensitive tool',
            getDefinition: () => ({
                name: 'sensitive_tool',
                description: 'sensitive tool',
                activation: { kind: 'always', scope: 'session', activated: true }
            })
        }];
    }

    getTools() {
        return this.tools;
    }

    getTool(name: string) {
        return this.tools.find(tool => tool.name === name);
    }

    async invoke(name: string, input?: any): Promise<any> {
        return name === 'sensitive_tool' ? { ok: true } : null;
    }
}

class ReversiblePutTool {
    name: string;
    captured: any[] = [];
    compensated: any[] = [];

    constructor(name = 'reversible_put', private orderLog?: string[]) {
        this.name = name;
    }

    getDefinition() {
        return {
            name: this.name,
            description: 'reversible put',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { sideEffect: true }
        };
    }

    async captureCompensation(input: any): Promise<any> {
        this.captured.push(input);
        return { ...input, existingIds: ['pre-existing-id'] };
    }

    async compensate(captured: any): Promise<void> {
        this.compensated.push(captured);
        this.orderLog?.push(this.name);
    }

    async invoke(input: any): Promise<any> {
        return { stored: true };
    }
}

class SingleToolRegistry extends ToolRegistry {
    constructor(private tool: any) {
        super();
    }

    getTools() {
        return [this.tool];
    }

    getTool(name: string) {
        return this.tool.name === name ? this.tool : undefined;
    }

    async invoke(name: string): Promise<any> {
        return this.tool.name === name ? this.tool.invoke({}) : null;
    }
}

class MultiToolRegistry extends ToolRegistry {
    constructor(private tools: any[]) {
        super();
    }

    getTools() {
        return this.tools;
    }

    getTool(name: string) {
        return this.tools.find(tool => tool.name === name);
    }

    async invoke(name: string, input: any): Promise<any> {
        const tool = this.getTool(name);
        return tool ? tool.invoke(input) : null;
    }
}

/**
 * Emits a single tool call, then on the second model request either blocks
 * until aborted ('block') or throws ('error').
 */
class ToolThenBlockModelAdapter extends EchoModelAdapter {
    calls = 0;
    requests: any[] = [];

    constructor(private toolName: string, private secondBehavior: 'block' | 'error') {
        super();
    }

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        if (this.calls++ === 0) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: 'tc-1', name: this.toolName, input: { key: 'note', value: 'v1' } }]
            };
        }
        if (this.secondBehavior === 'error') {
            throw new Error('model exploded');
        }
        await new Promise<void>((resolve, reject) => {
            if (request.signal?.aborted) {
                reject(new Error('The operation was aborted.'));
                return;
            }
            request.signal?.addEventListener('abort', () => {
                reject(new Error('The operation was aborted.'));
            });
        });
        return { message: 'done', stopReason: 'end' };
    }
}

/**
 * Emits two sequential tool calls, then throws on the third model request.
 */
class SequentialTwoToolModelAdapter extends EchoModelAdapter {
    calls = 0;

    constructor(private firstTool: string, private secondTool: string) {
        super();
    }

    async complete(): Promise<any> {
        const call = this.calls++;
        if (call === 0) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: 'tc-1', name: this.firstTool, input: { key: 'a', value: '1' } }]
            };
        }
        if (call === 1) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: 'tc-2', name: this.secondTool, input: { key: 'b', value: '2' } }]
            };
        }
        throw new Error('model exploded');
    }
}