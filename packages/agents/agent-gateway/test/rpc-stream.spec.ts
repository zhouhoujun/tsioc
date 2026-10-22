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

async function buildStreamHarness(toolEvent: {
    toolName?: string;
    inputSummary?: string;
    rawInputSummary?: string;
    outputSummary?: string;
} = {}, approvalEvent?: {
    id?: string;
    toolName?: string;
    reason?: string;
    summary?: string;
    hasInput?: boolean;
    inputSummary?: string;
    timeoutMs?: number;
    expiresAt?: number;
}) {
    const toolName = toolEvent.toolName || 'read_file';
    const inputSummary = toolEvent.inputSummary ?? '/tmp/a.ts';
    const rawInputSummary = toolEvent.rawInputSummary ?? '{"path":"/tmp/a.ts"}';
    const outputSummary = toolEvent.outputSummary ?? 'content';
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
            events.onToolInvoked({
                sessionId,
                toolName,
                hasInput: true,
                inputSummary: rawInputSummary,
                receipt: {
                    receiptId: 'rcpt-1',
                    toolCallId: 'tc-1',
                    toolName,
                    executionMode: 'sequential',
                    status: 'running',
                    inputSummary
                }
            } as any);
            events.onToolCompleted({
                sessionId,
                toolName,
                output: outputSummary,
                receipt: {
                    receiptId: 'rcpt-1',
                    toolCallId: 'tc-1',
                    toolName,
                    executionMode: 'sequential',
                    status: 'success',
                    inputSummary,
                    outputSummary,
                    durationMs: 137
                }
            } as any);
            if (approvalEvent) {
                events.onApprovalRequested({
                    sessionId,
                    request: {
                        id: approvalEvent.id || 'ap-1',
                        toolName: approvalEvent.toolName || 'terminal',
                        sessionId,
                        reason: approvalEvent.reason || 'Tool "terminal" requires approval.',
                        summary: approvalEvent.summary || 'Tool "terminal" requires approval. Summary: {"command":"ls"}',
                        hasInput: approvalEvent.hasInput !== false,
                        inputSummary: approvalEvent.inputSummary || '{"command":"ls"}',
                        timeoutMs: approvalEvent.timeoutMs ?? 30000,
                        expiresAt: approvalEvent.expiresAt
                    }
                } as any);
            }
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

    @Test('tool_completed stream chunk carries the backend receipt durationMs')
    async toolCompletedChunkCarriesReceiptDuration() {
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
            id: 8,
            method: 'run.turn_stream',
            params: { sessionId: 'stream-duration-1', input: 'hello' }
        });

        const messages = chunks.map(chunk => JSON.parse(chunk));
        const completed = messages.find(message =>
            message.method === 'run.turn_stream.chunk' && message.params.eventType === 'tool_completed');
        expect(completed).toBeTruthy();
        expect(completed.params.toolCallId).toEqual('tc-1');
        expect(completed.params.durationMs).toEqual(137);
    }

    @Test('approval_requested stream chunk carries the structured request, not just content')
    async approvalChunkCarriesStructuredFields() {
        const { handler } = await buildStreamHarness({}, { id: 'ap-9', timeoutMs: 45000, expiresAt: 1700000000000 });
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
            method: 'run.turn_stream',
            params: { sessionId: 'stream-approval-1', input: 'hello' }
        });

        const messages = chunks.map(chunk => JSON.parse(chunk));
        const requested = messages.find(message =>
            message.method === 'run.turn_stream.chunk' && message.params.eventType === 'approval_requested');
        expect(requested).toBeTruthy();
        // The UI renders `$ <inputSummary>` and `Reason: <reason>`; without
        // these fields it fell back to `content` for both (duplicate text).
        expect(requested.params.inputSummary).toEqual('{"command":"ls"}');
        expect(requested.params.reason).toEqual('Tool "terminal" requires approval.');
        expect(requested.params.summary).toContain('Summary:');
        expect(requested.params.timeoutMs).toEqual(45000);
        expect(requested.params.expiresAt).toEqual(1700000000000);
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

    @Test('tool_invoked chunk carries receipt-derived toolCallId and clean input summary')
    async streamedToolInvokedCarriesToolCallId() {
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
            id: 4,
            method: 'run.turn_stream',
            params: { sessionId: 'stream-tool-id-s1', input: 'x' }
        });

        const messages = chunks.map(chunk => JSON.parse(chunk));
        const invoked = messages.find(message =>
            message.method === 'run.turn_stream.chunk' && message.params.eventType === 'tool_invoked');
        expect(invoked).toBeTruthy();
        expect(invoked.params.toolCallId).toEqual('tc-1');
        expect(invoked.params.toolName).toEqual('read_file');
        expect(String(invoked.params.content)).toContain('/tmp/a.ts');
        expect(String(invoked.params.content)).not.toContain('{"path"');
    }

    @Test('tool_completed chunk keeps the object when the output does not repeat it')
    async streamedToolCompletedKeepsObject() {
        const { handler } = await buildStreamHarness({
            toolName: 'terminal',
            inputSummary: "sed -n '1,120p' dist/src/cli.js",
            outputSummary: 'exit 0 · const token = argv[index];'
        });
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
            id: 5,
            method: 'run.turn_stream',
            params: { sessionId: 'stream-object-s1', input: 'x' }
        });

        const messages = chunks.map(chunk => JSON.parse(chunk));
        const completed = messages.find(message =>
            message.method === 'run.turn_stream.chunk' && message.params.eventType === 'tool_completed');
        expect(completed).toBeTruthy();
        // The completed row replaces the invocation row (same toolCallId), so the
        // command it acted on must survive onto the completed content.
        expect(String(completed.params.content)).toContain("sed -n '1,120p' dist/src/cli.js");
        expect(String(completed.params.content)).toContain('exit 0');
    }
}
