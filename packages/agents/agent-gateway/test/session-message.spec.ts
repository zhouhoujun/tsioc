import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer() {
    const appended: any[] = [];
    const turns: any[] = [];
    const sessions = {
        has: async () => true,
        get: async (sessionId: string) => ({ sessionId, createdAt: 1, updatedAt: 2, messages: [] }),
        setWorkspace: async () => undefined,
        appendRaw: async (_id: string, message: any) => { appended.push(message); }
    };
    const runtime = {
        runTurn: async (...args: any[]) => { turns.push(args); return {}; },
        getMessages: async () => [{ id: 'reply-1', role: 'assistant', content: 'done' }]
    };
    const server = new AppRpcServer(
        runtime as any,
        new RandomUuidGenerator(),
        sessions as any,
        {} as any,
        {} as any,
        { authorize: async () => 'anonymous', create: async () => undefined } as any,
        { track: () => undefined } as any,
        {} as any
    );
    return { server, appended, turns };
}

/**
 * `session.message.send` is the agent-teams primitive: append-only by default,
 * explicit `wake` when the target should run immediately.
 */
@Suite('cross-session messaging RPC')
export class CrossSessionMessageRpcTest {
    @Test('appends a user message with the sender metadata and does not run a turn')
    async appends() {
        const { server, appended, turns } = buildServer();
        const result = await (server as any).dispatch('session.message.send', {
            sessionId: 's2',
            text: 'please review the diff',
            fromSessionId: 's1'
        }, { principalId: 'p1' });
        expect(result).toEqual({ sessionId: 's2', messageId: expect.any(String), woken: false });
        expect(turns).toEqual([]);
        expect(appended.length).toEqual(1);
        expect(appended[0].role).toEqual('user');
        expect(appended[0].content).toEqual('please review the diff');
        expect(appended[0].metadata).toEqual({ kind: 'cross-session', fromSessionId: 's1' });
    }

    @Test('wake runs a turn on the target and returns the latest message id')
    async wakes() {
        const { server, appended, turns } = buildServer();
        const result = await (server as any).dispatch('session.message.send', {
            sessionId: 's2',
            text: 'start now',
            wake: true
        }, { principalId: 'p1' });
        expect(result).toEqual({ sessionId: 's2', messageId: 'reply-1', woken: true });
        expect(appended).toEqual([]);
        expect(turns.length).toEqual(1);
        expect(turns[0][0]).toEqual('s2');
        expect(turns[0][1]).toEqual('start now');
    }

    @Test('rejects missing text')
    async validates() {
        const { server } = buildServer();
        let thrown: any = null;
        try {
            await (server as any).dispatch('session.message.send', { sessionId: 's2', text: '  ' }, {});
        } catch (error) {
            thrown = error;
        }
        expect(String(thrown?.message || thrown)).toContain('text is required');
    }
}
