import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionService } from '../src/AgentConsoleSessionService';
import { persistQueuedPrompts } from '../src/AgentConsoleQueuedPrompts';

function fakeRpc(calls: Array<{ method: string; params: any }>, items: any[] = []) {
    return {
        request: async (method: string, params: any) => {
            calls.push({ method, params });
            if (method === 'session.inbox.get') {
                return { sessionId: params.sessionId, items };
            }
            return { sessionId: params?.sessionId, items: params?.items || [] };
        }
    };
}

@Suite('durable queue persistence')
export class QueueInboxPersistenceTest {
    @Test('writing the queue replaces the durable inbox')
    async persistsQueue() {
        const calls: Array<{ method: string; params: any }> = [];
        const host: any = {
            appRpc: fakeRpc(calls),
            state: { sessionId: 'chat-1' },
            rpcRequestContext: () => ({})
        };
        persistQueuedPrompts(host, 'chat-1', [
            { input: 'first', attachments: [], command: false },
            { input: '/compact', attachments: [], command: true }
        ]);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(calls[0].method).toEqual('session.inbox.replace');
        expect(calls[0].params.sessionId).toEqual('chat-1');
        expect(calls[0].params.items.map((item: any) => item.payload.input)).toEqual(['first', '/compact']);
        expect(calls[0].params.items[1].kind).toEqual('command');
    }

    @Test('the session service loads and replaces inbox items')
    async serviceRoundTrip() {
        const calls: Array<{ method: string; params: any }> = [];
        const service = new AgentConsoleSessionService(fakeRpc(calls, [
            { itemId: 'a', kind: 'user', payload: { input: 'hello', attachments: [], command: false } }
        ]) as any);
        expect(await service.loadInbox('chat-1')).toEqual([
            { itemId: 'a', kind: 'user', payload: { input: 'hello', attachments: [], command: false } }
        ]);
        await service.replaceInbox('chat-1', [{ itemId: 'b', kind: 'user', payload: { input: 'next' } }]);
        expect(calls.map(call => call.method)).toEqual(['session.inbox.get', 'session.inbox.replace']);
    }
}
