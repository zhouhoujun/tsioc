import expect = require('expect');
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, MemoryStore, ModelRequestError, provideAgentOrm, SessionStore } from '@tsdi/agent';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';
import { AppRpcHandler } from '../src/api/AppRpcHandler';
import { EventHandler } from '../src/api/EventHandler';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionHandler } from '../src/api/SessionHandler';
import { setRequestAuth } from '../src/auth/AuthMiddleware';

/**
 * A second-turn `NodeInjector has already been destroyed` reached the TUI as a
 * bare message: `toAppRpcError` copied only `message` into `data`, so
 * `error.stack` never crossed the JSON-RPC hop and every caller frame was lost.
 * These tests lock the stack (and its `cause` chain) into the error payload so
 * destroy/injection races stay diagnosable from the console.
 */
async function buildHarness(runStreamingTurn: (sessionId: string, input: string) => AsyncGenerator<any>) {
    const context = await Application.run({
        module: AgentModule,
        providers: provideAgentOrm({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    });
    const store = context.get(SessionStore);
    const memory = context.get(MemoryStore);
    const owners = new SessionOwnerStore(store);
    const events = new EventHandler(owners);
    const runtime = {
        async runTurn(sessionId: string, input: string) {
            return { output: input };
        },
        runStreamingTurn,
        async getMessages(sessionId: string) {
            return (await store.get(sessionId)).messages;
        },
        async putMemory() {
            return undefined as any;
        },
        async searchMemory() {
            return [] as any;
        }
    } as any;
    const tools = { getToolDefinitions: () => [] } as any;
    const sessions = new SessionHandler(runtime, store, owners);
    const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, tools, owners, sessions, events);
    return { handler: new AppRpcHandler(rpc), context };
}

async function streamTurn(handler: any, sessionId: string) {
    const route = handler.getRoutes().find((r: any) => r.method === 'POST' && r.path === '/rpc/stream')!;
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
        params: { sessionId, input: 'hello' }
    });
    return chunks.map(chunk => JSON.parse(chunk));
}

@Suite('AppRpcServer / run.turn_stream stack propagation')
export class TurnStreamStackPropagationTest {
    @Test('server-side stack survives the JSON-RPC boundary')
    async stackSurvivesRpcBoundary() {
        const { handler } = await buildHarness(async function* () {
            throw new Error('NodeInjector has already been destroyed.');
        });

        const messages = await streamTurn(handler, 'stack-s1');
        const errorMessage = messages.find(message => message.id === 7 && message.error);

        expect(errorMessage).toBeTruthy();
        expect(errorMessage.error.message).toEqual('NodeInjector has already been destroyed.');
        // The caller frames are the whole point: without them the crash is undiagnosable.
        expect(typeof errorMessage.error.data?.stack).toEqual('string');
        expect(errorMessage.error.data.stack).toContain('NodeInjector has already been destroyed.');
        expect(errorMessage.error.data.stack).toContain('TurnStreamStackPropagationTest');
    }

    @Test('cause chain is preserved alongside the top-level stack')
    async causeChainPreserved() {
        const { handler } = await buildHarness(async function* () {
            const error = new Error('outer failure') as Error & { cause?: unknown };
            error.cause = new Error('inner root cause');
            throw error;
        });

        const messages = await streamTurn(handler, 'cause-s1');
        const errorMessage = messages.find(message => message.id === 7 && message.error);

        expect(errorMessage).toBeTruthy();
        expect(errorMessage.error.data?.stack).toContain('inner root cause');
    }

    @Test('modelFailure payload keeps working alongside the stack')
    async modelFailureUnaffected() {
        const failure = {
            kind: 'quota' as const,
            status: 402,
            provider: 'deepseek',
            model: 'deepseek-flash',
            detail: 'Insufficient Balance',
            requestId: 'req-402',
            retryable: false
        };
        const { handler } = await buildHarness(async function* () {
            throw new ModelRequestError(failure);
        });

        const messages = await streamTurn(handler, 'quota-stack-s1');
        const errorMessage = messages.find(message => message.id === 7 && message.error);

        expect(errorMessage).toBeTruthy();
        expect(errorMessage.error.data?.modelFailure).toEqual(failure);
        expect(typeof errorMessage.error.data?.stack).toEqual('string');
    }

    @Test('non-Error throwables do not fabricate a stack')
    async nonErrorUnchanged() {
        const { handler } = await buildHarness(async function* () {
            throw 'plain string failure';
        });

        const messages = await streamTurn(handler, 'string-s1');
        const errorMessage = messages.find(message => message.id === 7 && message.error);

        expect(errorMessage).toBeTruthy();
        expect(errorMessage.error.code).toEqual(-32603);
        expect(errorMessage.error.message).toEqual('Internal error');
        expect(errorMessage.error.data?.stack).toBeUndefined();
    }
}
