import expect = require('expect');
import { Application } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';
import { SessionStore } from '../src/memory/SessionStore';
import { promoteInboxSteers } from '../src/runtime/SessionInboxPromotion';

async function store(): Promise<{ sessions: SessionStore; close(): Promise<void> }> {
    const ctx = await Application.run(AgentModule, {
        providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any)
    });
    return { sessions: ctx.get(SessionStore), close: () => ctx.close() };
}

@Suite('durable session inbox')
export class SessionInboxStoreTest {
    @Test('atomically takes the oldest steer item')
    async takesSteer() {
        const { sessions, close } = await store();
        try {
            await sessions.replaceInbox('chat-1', [
                { itemId: 'u', kind: 'user', payload: { input: 'queued' } },
                { itemId: 's1', kind: 'steer', payload: { input: 'steer one' } },
                { itemId: 's2', kind: 'steer', payload: { input: 'steer two' } }
            ]);
            expect((await sessions.takeInboxItem('chat-1', 'steer'))?.itemId).toEqual('s1');
            expect((await sessions.listInbox('chat-1')).map(item => item.itemId)).toEqual(['u', 's2']);
            expect((await sessions.takeInboxItem('chat-1', 'steer'))?.itemId).toEqual('s2');
            expect(await sessions.takeInboxItem('chat-1', 'steer')).toEqual(undefined);
        } finally {
            await close();
        }
    }

    @Test('appends one item without replacing the queue')
    async appends() {
        const { sessions, close } = await store();
        try {
            await sessions.replaceInbox('chat-1', [{ itemId: 'u', kind: 'user', payload: { input: 'queued' } }]);
            const appended = await sessions.appendInboxItem('chat-1', { itemId: 's1', kind: 'steer', payload: { input: 'steer' } });
            expect(appended).toMatchObject({ itemId: 's1', seq: 2 });
            expect((await sessions.listInbox('chat-1')).map(item => item.itemId)).toEqual(['u', 's1']);
        } finally {
            await close();
        }
    }

    @Test('promotes steers by appending user messages')
    async promotes() {
        const items = [
            { itemId: 's1', kind: 'steer', payload: { input: 'first steer' } },
            { itemId: 's2', kind: 'steer', payload: { input: 'second steer' } }
        ];
        const appended: string[] = [];
        const fake: any = {
            takeInboxItem: async () => items.shift(),
            append: async (_sessionId: string, message: any) => { appended.push(message.content); }
        };
        expect(await promoteInboxSteers(fake, 'chat-1', (role, content) => ({ id: content, role, content, createdAt: 1 } as any)))
            .toEqual(2);
        expect(appended).toEqual(['first steer', 'second steer']);
    }

    @Test('replaces and lists the ordered queue')
    async roundTrip() {
        const { sessions, close } = await store();
        try {
            await sessions.replaceInbox('chat-1', [
                { itemId: 'a', kind: 'user', payload: { input: 'first' } },
                { itemId: 'b', kind: 'steer', payload: { input: 'second' } }
            ]);
            const items = await sessions.listInbox('chat-1');
            expect(items.map(item => [item.itemId, item.seq, item.payload.input])).toEqual([
                ['a', 1, 'first'],
                ['b', 2, 'second']
            ]);

            const replaced = await sessions.replaceInbox('chat-1', [
                { itemId: 'c', kind: 'user', payload: { input: 'only' } }
            ]);
            expect(replaced.map(item => item.itemId)).toEqual(['c']);
            expect(await sessions.replaceInbox('chat-1', [])).toEqual([]);
            expect(await sessions.listInbox('chat-1')).toEqual([]);
        } finally {
            await close();
        }
    }
}
