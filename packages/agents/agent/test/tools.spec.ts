import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { MemoryPutTool, MemorySearchTool } from '../src/tools/BuiltinTools';
import { DefaultApprovalStrategy, ToolApprovalManager } from '../src/tools/ToolApprovalManager';

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

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

    @Test('approval manager exposes real pending requests')
    async approvalManagerReturnsPendingMetadata() {
        const approvals = new ToolApprovalManager(
            new FakeApp() as any,
            new DefaultApprovalStrategy(['shell.exec']),
            { defaultTimeoutMs: 1000 }
        );

        const pendingPromise = approvals.requireApproval('shell.exec', { cmd: 'ls' }, 's1');
        await new Promise(resolve => setTimeout(resolve, 10));

        const pending = approvals.getPending();
        expect(pending.length).toEqual(1);
        expect(pending[0].toolName).toEqual('shell.exec');
        expect(pending[0].sessionId).toEqual('s1');
        expect(pending[0].input).toEqual({ cmd: 'ls' });
        expect(pending[0].reason).toContain('shell.exec');

        approvals.approve(pending[0].id);
        expect(await pendingPromise).toEqual(true);
        expect(approvals.getPending()).toEqual([]);
    }
}
