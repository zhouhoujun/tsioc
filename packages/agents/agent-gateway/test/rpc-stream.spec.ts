import expect = require('expect');
import { Buffer } from 'buffer';
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, MemoryStore, provideAgentOrm, SessionStore } from '@tsdi/agent';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';
import { AppRpcHandler } from '../src/api/AppRpcHandler';
import { EventHandler } from '../src/api/EventHandler';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionHandler } from '../src/api/SessionHandler';
import { setRequestAuth } from '../src/auth/AuthMiddleware';
import { AgentTurnStartedEvent, AgentToolInvokedEvent, AgentToolCompletedEvent, AgentTurnCompletedEvent } from '@tsdi/agent';

async function buildStreamHarness() {
    const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
    const store = context.get(SessionStore);
    const memory = context.get(MemoryStore);
    const owners = new SessionOwnerStore(store);
    const events = new EventHandler(owners);
    const runtime = {
        async runTurn(sessionId: string, input: string) {
            await store.append(sessionId, { id: 'u1', role: 'user', content: input, createdAt: 1 } as any);
            await store.append(sessionId, { id: 'a1', role: 'assistant', content: `done:${input}`, createdAt: 2 } as any);
            return { output: `done:${input}` };
        },
        async *runStreamingTurn(sessionId: string, input: string) {
            events.onToolInvoked({ sessionId, toolName: 'read_file', hasInput: true, inputSummary: '/tmp/a.ts' } as any);
            events.onToolCompleted({ sessionId, toolName: 'read_file', output: 'content' } as any);
            yield { type: 'content', content: `chunk-${input}` };
            events.onTurnCompleted({ sessionId, message: { content: 'done' } } as any);
            yield { type: 'done', content: '' };
        },
        async getMessages(sessionId: string) {
            return (await store.get(sessionId)).messages;
        },
        async putMemory(sessionId: string, key: string, value: string) {
            const record = { id: `${sessionId}:${key}`, sessionId, key, value, scope: 'session', createdAt: Date.now() } as any;
            await memory.put(record);
            return record;
        },
        async searchMemory(sessionId: string, query: string) {
            return memory.search(query, sessionId);
        }
    } as any;
    const tools = { getToolDefinitions: () => [] } as any;
    const sessions = new SessionHandler(runtime, store, owners);
    const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, tools, owners, sessions, events);
    const handler = new AppRpcHandler(rpc);
    return { rpc, handler, events, store, owners, context };
}

@Suite('AppRpcHandler /rpc/stream')
export class AppRpcStreamTest {
    @Test('registers POST /rpc/stream route')
    async streamRouteRegistered() {
        const { handler } = await buildStreamHarness();
        const routes = handler.getRoutes();
        expect(routes.some(route => route.method === 'POST' && route.path === '/rpc/stream')).toBe(true);
    }

    @Test('non-streaming method yields a single NDJSON result line')
    async nonStreamingMethodYieldsResult() {
        const { handler } = await buildStreamHarness();
        const route = handler.getRoutes().find(route => route.method === 'POST' && route.path === '/rpc/stream')!;
        const chunks: string[] = [];
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (_code: number, _headers: any) => res,
            write: (chunk: string) => {
                chunks.push(chunk);
                return true;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any, { jsonrpc: '2.0', id: 1, method: 'app.ping' });
        expect(chunks.length).toEqual(1);
        const message = JSON.parse(chunks[0]);
        expect(message.jsonrpc).toEqual('2.0');
        expect(message.id).toEqual(1);
        expect(message.result.ok).toEqual(true);
    }

    @Test('run.turn_stream yields chunk notification then done result as NDJSON')
    async streamTurnYieldsChunksAndResult() {
        const { handler } = await buildStreamHarness();
        const route = handler.getRoutes().find(route => route.method === 'POST' && route.path === '/rpc/stream')!;
        const chunks: string[] = [];
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (_code: number, _headers: any) => res,
            write: (chunk: string) => {
                chunks.push(chunk);
                return true;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any, {
            jsonrpc: '2.0',
            id: 7,
            method: 'run.turn_stream',
            params: { sessionId: 'stream-s1', input: 'hello' },
            meta: { requestId: 'stream-request-7', sessionEpoch: 4 }
        });

        const messages = chunks.map(chunk => JSON.parse(chunk));
        const chunkMessages = messages.filter(message => message.method === 'run.turn_stream.chunk');
        expect(chunkMessages.length).toBeGreaterThanOrEqual(2);
        expect(chunkMessages[0].params.chunkType).toEqual('event');
        expect(chunkMessages[0].params.eventType).toEqual('turn_started');
        expect(chunkMessages[0].meta).toEqual({ requestId: 'stream-request-7', sessionEpoch: 4 });
        const contentChunk = chunkMessages.find(message => message.params.chunkType === 'content');
        expect(contentChunk.params.content).toEqual('chunk-hello');

        const doneMessage = messages.find(message => message.id === 7 && 'result' in message);
        expect(doneMessage).toBeTruthy();
        expect(doneMessage.result.sessionId).toEqual('stream-s1');
        expect(doneMessage.meta).toEqual({ requestId: 'stream-request-7', sessionEpoch: 4 });
    }

    @Test('unknown method yields NDJSON error line')
    async unknownMethodYieldsError() {
        const { handler } = await buildStreamHarness();
        const route = handler.getRoutes().find(route => route.method === 'POST' && route.path === '/rpc/stream')!;
        const chunks: string[] = [];
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (_code: number, _headers: any) => res,
            write: (chunk: string) => {
                chunks.push(chunk);
                return true;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any, {
            jsonrpc: '2.0',
            id: 9,
            method: 'no.such.method'
        });
        const message = JSON.parse(chunks[0]);
        expect(message.error.code).toEqual(-32601);
        expect(message.id).toEqual(9);
    }

    @Test('streamed tool events are flushed as stream chunk notifications')
    async streamedToolEventsFlush() {
        const { handler } = await buildStreamHarness();
        const route = handler.getRoutes().find(route => route.method === 'POST' && route.path === '/rpc/stream')!;
        const chunks: string[] = [];
        const req = {} as any;
        setRequestAuth(req, { token: 'token-1', principalId: 'user-1' });
        const res = {
            writeHead: (_code: number, _headers: any) => res,
            write: (chunk: string) => {
                chunks.push(chunk);
                return true;
            },
            end: () => res
        } as any;

        await route.handler(req, res, {} as any, {
            jsonrpc: '2.0',
            id: 3,
            method: 'run.turn_stream',
            params: { sessionId: 'stream-events-s1', input: 'x' }
        });

        const messages = chunks.map(chunk => JSON.parse(chunk));
        const toolEvents = messages
            .filter(message => message.method === 'run.turn_stream.chunk' && message.params.eventType)
            .map(message => message.params.eventType);
        expect(toolEvents).toContain('turn_started');
        expect(toolEvents).toContain('tool_invoked');
        expect(toolEvents).toContain('tool_completed');
        expect(toolEvents).toContain('turn_completed');
    }
}
