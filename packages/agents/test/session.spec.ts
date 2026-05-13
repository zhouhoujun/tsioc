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
}
