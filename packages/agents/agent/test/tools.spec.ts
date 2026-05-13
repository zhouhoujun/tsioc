import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { MemoryPutTool, MemorySearchTool } from '../src/tools/BuiltinTools';

@Suite('Agent builtin tools')
export class BuiltinToolsTest {
    @Test('memory put stores session memory')
    async memoryPutStoresRecord() {
        const store = new InMemoryMemoryStore();
        const tool = new MemoryPutTool();
        await tool.invoke({ key: 'topic', value: 'router', scope: 'session' }, {
            sessionId: 's1',
            memory: store
        });
        const records = await store.getAll('s1');
        expect(records.length).toEqual(1);
        expect(records[0].key).toEqual('topic');
        expect(records[0].value).toEqual('router');
        expect(records[0].scope).toEqual('session');
    }

    @Test('memory search returns matching records')
    async memorySearchFindsRecord() {
        const store = new InMemoryMemoryStore();
        const put = new MemoryPutTool();
        const search = new MemorySearchTool();
        await put.invoke({ key: 'device', value: 'router-shell' }, {
            sessionId: 's1',
            memory: store
        });
        await put.invoke({ key: 'device', value: 'other' }, {
            sessionId: 's2',
            memory: store
        });
        const results = await search.invoke({ query: 'router' }, {
            sessionId: 's1',
            memory: store
        });
        expect(results.length).toEqual(1);
        expect(results[0].value).toEqual('router-shell');
    }
}
