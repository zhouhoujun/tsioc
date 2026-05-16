import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';

@Suite('Agent session store')
export class SessionStoreTest {
    @Test('stores ordered messages')
    async appendMessages() {
        const store = new InMemorySessionStore();
        await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
        await store.append('session', { id: '2', role: 'assistant', content: 'hello', createdAt: 2 });
        const state = await store.get('session');
        expect(state.messages.length).toEqual(2);
        expect(state.messages[0].content).toEqual('hi');
        expect(state.messages[1].content).toEqual('hello');
    }

    @Test('tracks created and updated timestamps')
    async tracksTimestamps() {
        const store = new InMemorySessionStore();
        const empty = await store.get('session');
        expect(typeof empty.createdAt).toEqual('number');
        expect(typeof empty.updatedAt).toEqual('number');

        await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
        const state = await store.get('session');
        expect(state.createdAt).toBeTruthy();
        expect(state.updatedAt).toBeTruthy();
        expect(state.updatedAt! >= state.createdAt!).toEqual(true);
    }

    @Test('deletes only requested session')
    async deletesOneSession() {
        const store = new InMemorySessionStore();
        await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.append('session-2', { id: '2', role: 'user', content: 'two', createdAt: 2 });

        store.delete('session-1');

        expect((await store.get('session-1')).messages).toEqual([]);
        expect((await store.get('session-2')).messages.length).toEqual(1);
    }

    @Test('stores owner metadata and lists session ids')
    async storesOwnerAndListsSessionIds() {
        const store = new InMemorySessionStore();
        await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.append('session-2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
        await store.setOwner('session-1', 'user-1');

        const state = await store.get('session-1');
        expect(state.ownerPrincipalId).toEqual('user-1');
        expect(await store.listSessionIds()).toEqual(['session-1', 'session-2']);
    }

    @Test('clears owner without recreating deleted session')
    async clearsOwnerWithoutRecreatingDeletedSession() {
        const store = new InMemorySessionStore();
        await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.setOwner('session-1', 'user-1');
        store.delete('session-1');

        await store.setOwner('session-1', undefined);
        expect(await store.has('session-1')).toEqual(false);
    }
}
