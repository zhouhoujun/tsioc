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
import { AgentErrorEvent, AgentTurnCancelledEvent, AgentTurnCompletedEvent } from '../src/runtime/AgentEvents';

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
}
