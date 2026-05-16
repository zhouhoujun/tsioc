import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { LocalToolRegistry } from '../src/tools/LocalToolRegistry';
import { AgentTool } from '../src/tools/AgentTool';
import { MemoryPutTool, MemorySearchTool } from '../src/tools/BuiltinTools';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '../src/tools/ToolApprovalManager';

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

class DescribedTool implements AgentTool {
    name = 'described';
    description = 'legacy description';
    inputSchema = { type: 'object' };
    toolset = 'custom';
    source = 'test';
    execution = { readOnly: true };

    getDefinition() {
        return {
            name: this.name,
            description: 'resolved description',
            inputSchema: this.inputSchema,
            toolset: this.toolset,
            source: this.source,
            execution: this.execution
        };
    }

    async invoke(input: any): Promise<any> {
        return input;
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
        expect(pending[0].hasInput).toEqual(true);
        expect(pending[0].inputSummary).toContain('ls');
        expect((pending[0] as any).input).toEqual(undefined);
        expect(pending[0].reason).toContain('shell.exec');
        expect(pending[0].summary).toContain('shell.exec');

        approvals.approve(pending[0].id);
        expect(await pendingPromise).toEqual(true);
        expect(approvals.getPending()).toEqual([]);
    }

    @Test('approval manager returns rich decisions')
    async approvalManagerReturnsDecisionStates() {
        const approvals = new ToolApprovalManager(
            new FakeApp() as any,
            new DefaultApprovalStrategy(['shell.exec']),
            { defaultTimeoutMs: 1000 }
        );

        expect((await approvals.checkApproval('echo', { value: 'ok' }, 's1')).decision).toEqual(ApprovalDecision.NOT_REQUIRED);

        const pendingPromise = approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        await new Promise(resolve => setTimeout(resolve, 10));
        const pending = approvals.getPending();
        approvals.reject(pending[0].id);
        expect((await pendingPromise).decision).toEqual(ApprovalDecision.DENIED);
    }

    @Test('approval manager snapshots pending input')
    async approvalManagerSnapshotsPendingInput() {
        const approvals = new ToolApprovalManager(
            new FakeApp() as any,
            new DefaultApprovalStrategy(['shell.exec']),
            { defaultTimeoutMs: 1000 }
        );
        const input = { cmd: 'ls', options: { recursive: false } };

        const pendingPromise = approvals.checkApproval('shell.exec', input, 's1');
        await new Promise(resolve => setTimeout(resolve, 10));
        input.options.recursive = true;

        const pending = approvals.getPending();
        expect(pending[0].hasInput).toEqual(true);
        expect(pending[0].inputSummary).toContain('recursive');
        expect(pending[0].inputSummary).toContain('false');
        expect(pending[0].inputSummary).not.toContain('true');
        approvals.reject(pending[0].id);
        expect((await pendingPromise).decision).toEqual(ApprovalDecision.DENIED);
    }

    @Test('approval manager denies requests above pending limit')
    async approvalManagerDeniesRequestsAbovePendingLimit() {
        const approvals = new ToolApprovalManager(
            new FakeApp() as any,
            new DefaultApprovalStrategy(['shell.exec']),
            { defaultTimeoutMs: 1000, maxPendingApprovals: 1 }
        );

        const firstPending = approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        await new Promise(resolve => setTimeout(resolve, 10));
        const second = await approvals.checkApproval('shell.exec', { cmd: 'pwd' }, 's1');

        expect(second.decision).toEqual(ApprovalDecision.DENIED);
        expect(approvals.getPending().length).toEqual(1);
        approvals.reject(approvals.getPending()[0].id);
        expect((await firstPending).decision).toEqual(ApprovalDecision.DENIED);
    }

    @Test('approval manager caps timeout')
    async approvalManagerCapsTimeout() {
        const approvals = new ToolApprovalManager(
            new FakeApp() as any,
            new DefaultApprovalStrategy(['shell.exec']),
            { defaultTimeoutMs: 5000, maxTimeoutMs: 1000 }
        );

        const pendingPromise = approvals.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
        await new Promise(resolve => setTimeout(resolve, 10));
        const pending = approvals.getPending();
        expect(pending[0].timeoutMs).toEqual(1000);
        approvals.reject(pending[0].id);
        expect((await pendingPromise).decision).toEqual(ApprovalDecision.DENIED);
    }

    @Test('local tool registry returns resolved definitions with compatibility metadata')
    localToolRegistryReturnsResolvedDefinitions() {
        const registry = new LocalToolRegistry([new DescribedTool()], new InMemoryMemoryStore());

        expect(registry.getTools().length).toEqual(1);
        expect(registry.getTool('described')?.description).toEqual('legacy description');
        expect(registry.getToolDefinitions()).toEqual([{
            name: 'described',
            description: 'resolved description',
            inputSchema: { type: 'object' },
            toolset: 'custom',
            source: 'test',
            execution: { readOnly: true }
        }]);
    }

    @Test('local tool registry invokes tools with session context')
    async localToolRegistryInvokesToolsWithContext() {
        const store = new InMemoryMemoryStore();
        const registry = new LocalToolRegistry([new MemoryPutTool()], store);

        const result = await registry.invoke('memory.put', { key: 'topic', value: 'router' }, 's1');
        expect(result.stored).toEqual(true);
        expect((await store.getAll('s1')).length).toEqual(1);
    }
}
