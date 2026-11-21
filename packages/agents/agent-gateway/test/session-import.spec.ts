import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer() {
    const store: { messages: any[]; title?: string; summary?: string; workspace?: string } = { messages: [] };
    const sessions = {
        has: async () => false,
        get: async (sessionId: string) => ({
            sessionId,
            createdAt: 1,
            updatedAt: 2,
            messages: store.messages.slice(),
            title: store.title,
            summary: store.summary,
            workspace: store.workspace
        }),
        setWorkspace: async (_id: string, workspace?: string) => { store.workspace = workspace; },
        appendRaw: async (_id: string, message: any) => { store.messages.push(message); return undefined; },
        setTitle: async (_id: string, title?: string) => { store.title = title; },
        setSummary: async (_id: string, summary?: string) => { store.summary = summary; }
    };
    const server = new AppRpcServer(
        {} as any,
        new RandomUuidGenerator(),
        sessions as any,
        {} as any,
        {} as any,
        { authorize: async () => 'anonymous', create: async () => undefined } as any,
        { track: () => undefined } as any,
        {} as any
    );
    return { server, store };
}

/**
 * `session.import` is the gateway side of `/import`: message ids are always
 * regenerated so an imported transcript cannot collide with existing rows.
 */
@Suite('session import RPC')
export class SessionImportRpcTest {
    @Test('imports messages into a fresh session with regenerated ids')
    async imports() {
        const { server, store } = buildServer();
        const result = await (server as any).dispatch('session.import', {
            messages: [
                { id: 'm1', role: 'user', content: 'hello', createdAt: 10 },
                { id: 'm2', role: 'assistant', content: 'hi', createdAt: 11 },
                { id: 'm3', role: 'narrator', content: 'skip me' }
            ],
            title: 'Imported chat',
            summary: 'from a share'
        }, { principalId: 'p1' });
        expect(String(result.sessionId).startsWith('chat')).toEqual(true);
        expect(result.importedCount).toEqual(2);
        expect(result.messageCount).toEqual(2);
        expect(store.messages.map(message => message.content)).toEqual(['hello', 'hi']);
        expect(store.messages[0].id).not.toEqual('m1');
        expect(store.title).toEqual('Imported chat');
        expect(store.summary).toEqual('from a share');
    }

    @Test('rejects empty payloads and absurd message counts')
    async validates() {
        const { server } = buildServer();
        let empty: any = null;
        try {
            await (server as any).dispatch('session.import', { messages: [] }, {});
        } catch (error) {
            empty = error;
        }
        expect(String(empty?.message || empty)).toContain('messages are required');

        let huge: any = null;
        try {
            await (server as any).dispatch('session.import', {
                messages: Array.from({ length: 2001 }, () => ({ role: 'user', content: 'x' }))
            }, {});
        } catch (error) {
            huge = error;
        }
        expect(String(huge?.message || huge)).toContain('too many messages');
    }
}
