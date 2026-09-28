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
 * The live TUI reported a bare provider string
 * (`Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance`)
 * instead of the actionable quota wording. The turn error crosses the JSON-RPC
 * boundary, so this test locks the structured `ModelFailure` into the error
 * payload the console consumes. Plain `Error`s must keep the previous shape.
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

@Suite('AppRpcServer / run.turn_stream model failure transport')
export class TurnStreamModelFailureTest {
    @Test('quota ModelRequestError keeps its structured failure in the error payload')
    async quotaFailureSurvivesRpcBoundary() {
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

        const messages = await streamTurn(handler, 'quota-s1');
        const errorMessage = messages.find(message => message.id === 7 && message.error);

        expect(errorMessage).toBeTruthy();
        expect(errorMessage.error.message).toEqual(
            'Model request failed with 402 (deepseek/deepseek-flash): Insufficient Balance'
        );
        // The console needs the structured payload to render actionable wording.
        expect(errorMessage.error.data?.modelFailure).toEqual(failure);
    }

    @Test('plain Error keeps the previous message-only shape')
    async plainErrorUnchanged() {
        const { handler } = await buildHarness(async function* () {
            throw new Error('boom');
        });

        const messages = await streamTurn(handler, 'plain-s1');
        const errorMessage = messages.find(message => message.id === 7 && message.error);

        expect(errorMessage).toBeTruthy();
        expect(errorMessage.error.code).toEqual(-32603);
        expect(errorMessage.error.message).toEqual('boom');
        expect(errorMessage.error.data?.modelFailure).toBeUndefined();
    }
}
