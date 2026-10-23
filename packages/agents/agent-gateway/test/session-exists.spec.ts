import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer(existing: Set<string>) {
    const sessions = {
        has: async (sessionId: string) => existing.has(sessionId),
        get: async (sessionId: string) => ({ sessionId, createdAt: 1, updatedAt: 2, workspace: '/work/app', messages: [] }),
        setWorkspace: async () => undefined
    };
    return new AppRpcServer(
        {} as any,
        new RandomUuidGenerator(),
        sessions as any,
        {} as any,
        {} as any,
        { authorize: async () => 'anonymous' } as any,
        { track: () => undefined } as any,
        {} as any
    );
}

@Suite('session.exists probes before a resume can create')
export class SessionExistsTest {

    @Test('reports an existing session')
    async existingSession() {
        const server = buildServer(new Set(['chat-existing']));
        const result = await (server as any).dispatch('session.exists', { sessionId: 'chat-existing' }, {});
        expect(result).toEqual({ sessionId: 'chat-existing', exists: true });
    }

    @Test('reports a missing session without creating it')
    async missingSession() {
        const server = buildServer(new Set());
        const result = await (server as any).dispatch('session.exists', { sessionId: 'chat-typo' }, {});
        expect(result).toEqual({ sessionId: 'chat-typo', exists: false });
    }

    @Test('rejects a missing session id')
    async requiresSessionId() {
        const server = buildServer(new Set());
        let thrown: any = null;
        try {
            await (server as any).dispatch('session.exists', {}, {});
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeTruthy();
    }
}
