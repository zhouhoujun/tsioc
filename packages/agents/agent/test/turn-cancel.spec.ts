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
import { AgentApprovalFailedEvent, AgentErrorEvent, AgentTurnCancelledEvent, AgentTurnCompletedEvent } from '../src/runtime/AgentEvents';
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
        expect(cancelled).toEqual(true);

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
        expect(cancelled).toEqual(false);

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
        expect(await cancelRuntime.cancelTurn('s1')).toEqual(true);
        expect(await cancelRuntime.cancelTurn('s1')).toEqual(false);
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
        expect(cancelled).toEqual(true);

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
        expect(cancelled).toEqual(true);

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
        expect(cancelled).toEqual(true);

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