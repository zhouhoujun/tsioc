import expect = require('expect');
import { Application } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';
import { SessionStore } from '../src/memory/SessionStore';

async function store(): Promise<{ sessions: SessionStore; close(): Promise<void> }> {
    const ctx = await Application.run(AgentModule, {
        providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any)
    });
    return { sessions: ctx.get(SessionStore), close: () => ctx.close() };
}

@Suite('durable session inbox')
export class SessionInboxStoreTest {
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
