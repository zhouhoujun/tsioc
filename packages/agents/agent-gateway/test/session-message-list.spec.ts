import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer(sessionsById: Record<string, any[]>, owned: string[] = Object.keys(sessionsById)) {
    const sessions = {
        has: async () => true,
        get: async (sessionId: string) => ({ sessionId, createdAt: 1, updatedAt: 2, messages: sessionsById[sessionId] || [] }),
        listSessionIds: async () => Object.keys(sessionsById),
        setWorkspace: async () => undefined
    };
    const server = new AppRpcServer(
        {} as any,
        new RandomUuidGenerator(),
        sessions as any,
        {} as any,
        {} as any,
        {
            authorize: async () => 'anonymous',
            listOwned: async (ids: string[]) => ids.filter(id => owned.includes(id))
        } as any,
        { track: () => undefined } as any,
        {} as any
    );
    return { server };
}

/**
 * `session.message.list` powers the read-only cross-session message panel.
 * Only owned sessions are scanned, newest first, and the result is capped.
 */
@Suite('cross-session message list RPC')
export class CrossSessionMessageListRpcTest {
    @Test('returns cross-session messages newest first and skips plain user prompts')
    async lists() {
        const { server } = buildServer({
            s1: [
                { id: 'm1', role: 'user', content: 'plain', createdAt: 5, metadata: {} },
                { id: 'm2', role: 'user', content: 'from alpha', createdAt: 20, metadata: { kind: 'cross-session', fromSessionId: 'chat-alpha' } }
            ],
            s2: [
                { id: 'm3', role: 'user', content: 'from beta', createdAt: 30, metadata: { kind: 'cross-session', fromSessionId: 'chat-beta' } }
            ]
        });
        const result = await (server as any).dispatch('session.message.list', { limit: 10 }, { principalId: 'p1' });
        expect(result.messages.map((message: any) => message.messageId)).toEqual(['m3', 'm2']);
        expect(result.messages[1].fromSessionId).toEqual('chat-alpha');
        expect(result.messages[1].sessionId).toEqual('s1');
    }

    @Test('skips sessions the caller does not own')
    async ownership() {
        const { server } = buildServer({
            mine: [{ id: 'm1', role: 'user', content: 'ok', createdAt: 1, metadata: { kind: 'cross-session' } }],
            theirs: [{ id: 'm2', role: 'user', content: 'secret', createdAt: 2, metadata: { kind: 'cross-session' } }]
        }, ['mine']);
        const result = await (server as any).dispatch('session.message.list', {}, { principalId: 'p1' });
        expect(result.messages.map((message: any) => message.sessionId)).toEqual(['mine']);
    }

    @Test('caps the result count')
    async caps() {
        const messages = Array.from({ length: 8 }, (_value, index) => ({
            id: `m${index}`, role: 'user', content: `message ${index}`, createdAt: index,
            metadata: { kind: 'cross-session' }
        }));
        const { server } = buildServer({ s1: messages });
        const result = await (server as any).dispatch('session.message.list', { limit: 3 }, { principalId: 'p1' });
        expect(result.messages.length).toEqual(3);
        expect(result.messages[0].messageId).toEqual('m7');
    }
}
