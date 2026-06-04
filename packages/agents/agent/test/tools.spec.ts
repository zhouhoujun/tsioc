import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { LocalToolRegistry } from '../src/tools/LocalToolRegistry';
import { AgentTool } from '../src/tools/AgentTool';
import { MemoryPutTool, MemorySearchTool } from '../src/tools/BuiltinTools';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '../src/tools/ToolApprovalManager';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { AgentToolsModule, withAgentToolsOptions } from '../../agent-tools/src';
import { MemoryDeleteTool, MemoryListTool } from '../../agent-tools/memory';
import { ScheduleTool } from '../../agent-tools/scheduling';
import { withHttpAgentTools } from '../../agent-tools/src/provider';

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

class DeferredDefinitionTool implements AgentTool {
    name = 'heavy_tool';
    description = 'heavy schema tool';
    inputSchema = {
        type: 'object',
        properties: {
            value: { type: 'string' },
            count: { type: 'number' }
        },
        required: ['value']
    };
    outputSchema = {
        type: 'object',
        properties: {
            value: { type: 'string' },
            count: { type: 'number' }
        },
        required: ['value']
    };
    toolset = 'custom';
    source = 'test';
    execution = {
        readOnly: true,
        timeoutMs: 25,
        retryPolicy: { maxRetries: 1, delayMs: 1 },
        rateLimit: { maxCalls: 2, windowMs: 1000, scope: 'session' as const },
        redactOutput: true,
        auditEnabled: true
    };

    async invoke(input: any): Promise<any> {
        return input;
    }
}

class MetadataDefinitionTool implements AgentTool {
    name = 'metadata_tool';
    description = 'metadata aware tool';
    inputSchema = {
        type: 'object',
        properties: {
            value: { type: 'string' }
        },
        required: ['value']
    };
    toolset = 'custom';
    source = 'skill';
    execution = { readOnly: true };
    canonicalName = 'skill.demo.metadata_tool';
    aliases = ['demo-tool'];
    tags = ['skill', 'demo'];
    activation = { kind: 'deferred' as const, scope: 'session' as const };
    provenance = { origin: 'skill' as const, skillId: 'demo', sessionScoped: true };

    async invoke(input: any): Promise<any> {
        return input;
    }
}

class RegistryDiscoveryTool implements AgentTool {
    name = 'tool_search';
    description = 'search tools';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' }
        }
    };
    toolset = 'registry';
    source = 'test';
    execution = { readOnly: true };

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
        expect(registry.getToolDefinition('described')).toEqual({
            name: 'described',
            description: 'resolved description',
            inputSchema: { type: 'object' },
            outputSchema: undefined,
            toolset: 'custom',
            source: 'test',
            execution: { readOnly: true }
        });
        expect(registry.getToolDefinitions()).toEqual([{
            name: 'described',
            description: 'resolved description',
            inputSchema: { type: 'object' },
            outputSchema: undefined,
            toolset: 'custom',
            source: 'test',
            execution: { readOnly: true }
        }]);
    }

    @Test('local tool registry invokes tools with session context')
    async localToolRegistryInvokesToolsWithContext() {
        const store = new InMemoryMemoryStore();
        const registry = new LocalToolRegistry([new MemoryPutTool()], store);

        await registry.activateTool('s1', 'memory.put');
        const result = await registry.invoke('memory.put', { key: 'topic', value: 'router' }, 's1');
        expect(result.stored).toEqual(true);
        expect((await store.getAll('s1')).length).toEqual(1);
    }

    @Test('local tool registry returns lightweight stubs by default except registry tools')
    localToolRegistryReturnsDeferredDefinitions() {
        const registry = new LocalToolRegistry([
            new RegistryDiscoveryTool(),
            new DeferredDefinitionTool()
        ], new InMemoryMemoryStore());

        expect(registry.getToolDefinition('tool_search', 's1')).toEqual({
            name: 'tool_search',
            description: 'search tools',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                }
            },
            outputSchema: undefined,
            toolset: 'registry',
            source: 'test',
            execution: { readOnly: true }
        });
        expect(registry.getToolDefinition('heavy_tool', 's1')).toEqual({
            name: 'heavy_tool',
            description: 'heavy schema tool',
            toolset: 'custom',
            source: 'test',
            execution: {
                readOnly: true,
                timeoutMs: 25,
                retryPolicy: { maxRetries: 1, delayMs: 1 },
                rateLimit: { maxCalls: 2, windowMs: 1000, scope: 'session' },
                redactOutput: true,
                auditEnabled: true
            },
            canonicalName: undefined,
            aliases: undefined,
            tags: undefined,
            activation: undefined,
            provenance: undefined
        });
    }

    @Test('local tool registry exposes full schema only after session activation')
    async localToolRegistryActivatesDefinitionsPerSession() {
        const registry = new LocalToolRegistry([
            new RegistryDiscoveryTool(),
            new DeferredDefinitionTool()
        ], new InMemoryMemoryStore());

        expect(registry.getToolDefinition('heavy_tool', 's1')?.inputSchema).toEqual(undefined);
        await registry.activateTool('s1', 'heavy_tool');
        expect(registry.getToolDefinition('heavy_tool', 's1')?.inputSchema).toEqual({
            type: 'object',
            properties: {
                value: { type: 'string' },
                count: { type: 'number' }
            },
            required: ['value']
        });
        expect(registry.getToolDefinition('heavy_tool', 's1')?.outputSchema).toEqual({
            type: 'object',
            properties: {
                value: { type: 'string' },
                count: { type: 'number' }
            },
            required: ['value']
        });
        expect(registry.getToolDefinition('heavy_tool', 's2')?.inputSchema).toEqual(undefined);
    }

    @Test('local tool registry preserves provenance and activation metadata on lightweight and activated definitions')
    async localToolRegistryPreservesMetadataAcrossActivationStates() {
        const registry = new LocalToolRegistry([
            new RegistryDiscoveryTool(),
            new MetadataDefinitionTool()
        ], new InMemoryMemoryStore());

        expect(registry.getToolDefinition('metadata_tool', 's1')).toEqual({
            name: 'metadata_tool',
            description: 'metadata aware tool',
            outputSchema: undefined,
            toolset: 'custom',
            source: 'skill',
            execution: { readOnly: true },
            canonicalName: 'skill.demo.metadata_tool',
            aliases: ['demo-tool'],
            tags: ['skill', 'demo'],
            activation: { kind: 'deferred', scope: 'session', activated: false },
            provenance: { origin: 'skill', skillId: 'demo', sessionScoped: true }
        });

        await registry.activateTool('s1', 'metadata_tool');
        expect(registry.getToolDefinition('metadata_tool', 's1')).toEqual({
            name: 'metadata_tool',
            description: 'metadata aware tool',
            inputSchema: {
                type: 'object',
                properties: {
                    value: { type: 'string' }
                },
                required: ['value']
            },
            toolset: 'custom',
            source: 'skill',
            execution: { readOnly: true },
            canonicalName: 'skill.demo.metadata_tool',
            aliases: ['demo-tool'],
            tags: ['skill', 'demo'],
            activation: { kind: 'deferred', scope: 'session', activated: true },
            provenance: { origin: 'skill', skillId: 'demo', sessionScoped: true }
        });

        expect(registry.getToolDefinition('metadata_tool', 's2')).toEqual({
            name: 'metadata_tool',
            description: 'metadata aware tool',
            outputSchema: undefined,
            toolset: 'custom',
            source: 'skill',
            execution: { readOnly: true },
            canonicalName: 'skill.demo.metadata_tool',
            aliases: ['demo-tool'],
            tags: ['skill', 'demo'],
            activation: { kind: 'deferred', scope: 'session', activated: false },
            provenance: { origin: 'skill', skillId: 'demo', sessionScoped: true }
        });
    }

    @Test('local tool registry rejects invoke before activation and allows it after activation')
    async localToolRegistryRequiresActivationForDeferredTools() {
        const registry = new LocalToolRegistry([
            new RegistryDiscoveryTool(),
            new DeferredDefinitionTool()
        ], new InMemoryMemoryStore());

        const search = await registry.invoke('tool_search', { query: 'heavy' }, 's1');
        expect(search.query).toEqual('heavy');

        let error: Error | undefined;
        try {
            await registry.invoke('heavy_tool', { value: 'x' }, 's1');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('heavy_tool');
        expect(error?.message).toContain('activate');
        expect(error?.message).not.toContain('tool_inspect');

        await registry.activateTool('s1', 'heavy_tool');
        const result = await registry.invoke('heavy_tool', { value: 'x' }, 's1');
        expect(result).toEqual({ value: 'x' });
    }

    @Test('agent tools module registers tool definitions into registry')
    async agentToolsModuleRegistersDefinitions() {
        const ctx = await Application.run(AgentToolsModule, {
            providers: [
                ...withAgentToolsOptions({
                    web: {
                        search: {
                            async search(query: string) {
                                return [{ title: query, url: 'https://example.com' }];
                            }
                        }
                    }
                })
            ]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const definitions = registry.getToolDefinitions();
            expect(definitions.some(tool => tool.name === 'read_file')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'web_search')).toEqual(true);
            expect(definitions.find(tool => tool.name === 'calculator')?.execution?.readOnly).toEqual(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('agent tools module supports runtime registry invocation')
    async agentToolsModuleInvokesRegisteredTool() {
        const ctx = await Application.run(AgentToolsModule, {
            providers: [
                ...withAgentToolsOptions({
                    web: {
                        search: {
                            async search(query: string, limit?: number) {
                                return [{ title: `${query}:${limit}`, url: 'https://example.com', snippet: 'ok' }];
                            }
                        }
                    }
                })
            ]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            await registry.activateTool('s1', 'web_search');
            const result = await registry.invoke('web_search', { query: 'router', limit: 2 }, 's1');
            expect(result.results.length).toEqual(1);
            expect(result.results[0].title).toEqual('router:2');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent tools module keeps http and terminal opt-in while exposing registry tools')
    async agentToolsModuleKeepsHttpAndTerminalOptInWhileExposingRegistryTools() {
        const ctx = await Application.run(AgentToolsModule);
        try {
            const registry = ctx.get(ToolRegistry);
            const definitions = registry.getToolDefinitions();
            expect(definitions.some(tool => tool.name === 'memory.list')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'memory.delete')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'http_fetch')).toEqual(false);
            expect(definitions.some(tool => tool.name === 'http_request')).toEqual(false);
            expect(definitions.some(tool => tool.name === 'tool_search')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'tool_inspect')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'terminal')).toEqual(false);
        } finally {
            await ctx.close();
        }
    }

    @Test('http tools are available when explicitly enabled')
    async httpToolsAreAvailableWhenExplicitlyEnabled() {
        const fetchCalls: Array<{ url: string; init?: any; }> = [];
        const ctx = await Application.run(AgentToolsModule, {
            providers: [
                ...withAgentToolsOptions({
                    http: {
                        fetch: (async (url: string, init?: any) => {
                            fetchCalls.push({ url, init });
                            return {
                                ok: true,
                                status: 200,
                                headers: { forEach() { return; } },
                                text: async () => 'ok'
                            };
                        }) as any
                    }
                } as any),
                ...withHttpAgentTools()
            ]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            expect(registry.getToolDefinitions().some(tool => tool.name === 'http_fetch')).toEqual(true);
            expect(registry.getToolDefinitions().some(tool => tool.name === 'http_request')).toEqual(true);

            await registry.activateTool('s1', 'http_fetch');
            const fetched = await registry.invoke('http_fetch', { url: 'https://example.com/http' }, 's1');
            expect(fetched.status).toEqual(200);
            expect(fetchCalls[0].url).toEqual('https://example.com/http');

            const inspected = await registry.invoke('tool_inspect', { name: 'memory.list' }, 's1');
            expect(inspected.tool.name).toEqual('memory.list');
        } finally {
            await ctx.close();
        }
    }

    @Test('agent tools module registers memory tools but keeps terminal opt-in')
    async agentToolsModuleRegistersMemoryToolsButKeepsTerminalOptIn() {
        const ctx = await Application.run(AgentToolsModule);
        try {
            const registry = ctx.get(ToolRegistry);
            const definitions = registry.getToolDefinitions();
            expect(definitions.some(tool => tool.name === 'memory.list')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'memory.delete')).toEqual(true);
            expect(definitions.some(tool => tool.name === 'terminal')).toEqual(false);
        } finally {
            await ctx.close();
        }
    }

    @Test('memory tools operate through the registry with session visibility')
    async memoryToolsOperateThroughRegistry() {
        const store = new InMemoryMemoryStore();
        await store.put({ id: 's1-note', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 });
        await store.put({ id: 's2-note', sessionId: 's2', key: 'topic', value: 'switch', scope: 'session', createdAt: 2 });
        await store.put({ id: 'global-note', key: 'shared', value: 'policy', scope: 'global', createdAt: 3 });
        const registry = new LocalToolRegistry([new MemoryListTool(), new MemoryDeleteTool()], store);

        await registry.activateTool('s1', 'memory.list');
        await registry.activateTool('s1', 'memory.delete');
        const listed = await registry.invoke('memory.list', undefined, 's1');
        expect(listed.records.map((record: any) => record.id)).toEqual(['s1-note', 'global-note']);

        const deleted = await registry.invoke('memory.delete', { id: 's1-note' }, 's1');
        expect(deleted.deleted).toEqual(true);
        expect((await store.getAll('s1')).map(record => record.id)).toEqual(['global-note']);
    }

    @Test('local tool registry invokes activated tools with extended execution metadata')
    async localToolRegistryInvokesActivatedToolsWithExtendedExecutionMetadata() {
        class StrictTool extends DeferredDefinitionTool {
            invocations = 0;
            async invoke(input: any): Promise<any> {
                this.invocations++;
                return input;
            }
        }

        const tool = new StrictTool();
        const registry = new LocalToolRegistry([new RegistryDiscoveryTool(), tool], new InMemoryMemoryStore());
        await registry.activateTool('s1', 'heavy_tool');

        const result = await registry.invoke('heavy_tool', { count: 1, value: 'ok' }, 's1');

        expect(result).toEqual({ count: 1, value: 'ok' });
        expect(tool.invocations).toEqual(1);
    }

    @Test('local tool registry passes scheduler into schedule tool context')
    async localToolRegistryPassesSchedulerIntoScheduleToolContext() {
        class FakeScheduler {
            tasks: any[] = [];
            async start() { return; }
            async stop() { return; }
            async schedule(task: any) {
                this.tasks.push(task);
                return task;
            }
            async cancel() { return; }
            getTasks() {
                return this.tasks;
            }
        }

        const scheduler = new FakeScheduler();
        const registry = new LocalToolRegistry([new ScheduleTool({ get: () => scheduler } as any)], new InMemoryMemoryStore());
        await registry.activateTool('session-reg', 'schedule');
        await registry.invoke('schedule', { action: 'create', prompt: 'hello' }, 'session-reg');
        expect(scheduler.tasks.length).toEqual(1);
        expect(scheduler.tasks[0].sessionId).toEqual('session-reg');
    }
}
