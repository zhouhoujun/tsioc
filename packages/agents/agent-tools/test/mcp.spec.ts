import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AGENT_TOOL_BUNDLES, AgentModule, ToolRegistry } from '@tsdi/agent';
import { provideMcpTools, McpClient } from '../mcp';

class FakeMcpClient implements McpClient {
    calls: Array<{ name: string; args?: Record<string, any>; }> = [];
    listCalls = 0;

    async listTools() {
        this.listCalls++;
        return [{
            name: 'echo',
            title: 'Echo',
            description: 'Echo input back.',
            inputSchema: {
                type: 'object',
                properties: {
                    value: { type: 'string' }
                },
                required: ['value']
            }
        }];
    }

    async callTool(name: string, args?: Record<string, any>) {
        this.calls.push({ name, args });
        return {
            content: [{ type: 'text', text: `echo:${args?.value ?? ''}` }],
            structuredContent: { echoed: args?.value ?? null }
        };
    }
}

@Suite('Agent MCP tools')
export class AgentMcpToolsTest {

    @Test('manifest-backed MCP tools register namespaced tools through IoC')
    async manifestBackedMcpToolsRegisterNamespacedToolsThroughIoC() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{
                    id: 'demo',
                    client,
                    tools: [{
                        name: 'echo',
                        title: 'Echo',
                        description: 'Echo input back.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                value: { type: 'string' }
                            },
                            required: ['value']
                        }
                    }]
                }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const tool = registry.getToolDefinitions().find(def => def.name === 'mcp.demo.echo');
            expect(tool).toBeTruthy();
            expect(tool?.source).toEqual('mcp');
            expect(tool?.toolset).toEqual('mcp:demo');
            expect(tool?.canonicalName).toEqual('echo');
            expect(tool?.provenance).toEqual({
                origin: 'mcp',
                providerId: '@tsdi/agent-tools/mcp',
                serverId: 'demo',
                sessionScoped: true
            });
            expect(tool?.activation).toEqual({ kind: 'deferred', scope: 'session', activated: false });
        } finally {
            await ctx.close();
        }
    }

    @Test('manifest-backed MCP tools stay gated until session activation and mcp.call_tool respects that boundary')
    async manifestBackedMcpToolsStayGatedUntilSessionActivationAndThenInvokeConfiguredClient() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{
                    id: 'demo',
                    client,
                    tools: [{
                        name: 'echo',
                        title: 'Echo',
                        description: 'Echo input back.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                value: { type: 'string' }
                            },
                            required: ['value']
                        }
                    }]
                }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const before = registry.getToolDefinition('mcp.demo.echo', 's1');
            expect(before?.inputSchema).toEqual(undefined);

            let inactiveError: Error | undefined;
            try {
                await registry.invoke('mcp.demo.echo', { value: 'hello' }, 's1');
            } catch (err) {
                inactiveError = err as Error;
            }
            expect(inactiveError?.message).toContain('not activated');

            let callToolError: Error | undefined;
            try {
                await registry.invoke('mcp.call_tool', { serverId: 'demo', name: 'echo', arguments: { value: 'hello' } }, 's1');
            } catch (err) {
                callToolError = err as Error;
            }
            expect(callToolError?.message).toContain('not activated');

            const activated = await registry.activateTool('s1', 'mcp.demo.echo');
            expect(activated).toEqual(true);
            const after = registry.getToolDefinition('mcp.demo.echo', 's1');
            expect(after?.inputSchema).toBeTruthy();

            const result = await registry.invoke('mcp.demo.echo', { value: 'hello' }, 's1');
            expect(client.calls).toEqual([{ name: 'echo', args: { value: 'hello' } }]);
            expect(result.serverId).toEqual('demo');
            expect(result.tool).toEqual('echo');
            expect(result.content[0].text).toEqual('echo:hello');
            expect(result.structuredContent).toEqual({ echoed: 'hello' });

            const bridged = await registry.invoke('mcp.call_tool', { serverId: 'demo', name: 'echo', arguments: { value: 'again' } }, 's1');
            expect(bridged.content[0].text).toEqual('echo:again');
        } finally {
            await ctx.close();
        }
    }

    @Test('dynamic MCP servers register management tools without bootstrap discovery')
    async dynamicMcpServersRegisterManagementToolsWithoutBootstrapDiscovery() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{ id: 'demo', client }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const names = registry.getToolDefinitions().map(def => def.name);
            expect(names).toContain('mcp.list_tools');
            expect(names).toContain('mcp.call_tool');
            expect(names).not.toContain('mcp.demo.echo');
            expect(client.listCalls).toEqual(0);
        } finally {
            await ctx.close();
        }
    }

    @Test('mcp.list_tools discovers tools on demand')
    async mcpListToolsDiscoversToolsOnDemand() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{ id: 'demo', client }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const result = await registry.invoke('mcp.list_tools', { serverId: 'demo' }, 's1');
            expect(result.serverId).toEqual('demo');
            expect(result.tools.length).toEqual(1);
            expect(result.tools[0].name).toEqual('echo');
            expect(result.tools[0].fullName).toEqual('mcp.demo.echo');
            expect(client.listCalls).toEqual(1);
            const names = registry.getToolDefinitions().map(def => def.name);
            expect(names).not.toContain('mcp.demo.echo');
        } finally {
            await ctx.close();
        }
    }

    @Test('mcp.call_tool rejects dynamic server tools unless explicitly allowlisted')
    async mcpCallToolRejectsDynamicServerToolsUnlessExplicitlyAllowlisted() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{ id: 'demo', client }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            let error: Error | undefined;
            try {
                await registry.invoke('mcp.call_tool', { serverId: 'demo', name: 'echo', arguments: { value: 'hello' } }, 's1');
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toContain('not declared or allowlisted');
            expect(client.calls).toEqual([]);
        } finally {
            await ctx.close();
        }
    }

    @Test('mcp.call_tool allows explicitly allowlisted dynamic server tools')
    async mcpCallToolAllowsExplicitlyAllowlistedDynamicServerTools() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{ id: 'demo', client, allowedTools: ['echo'] }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            const result = await registry.invoke('mcp.call_tool', { serverId: 'demo', name: 'echo', arguments: { value: 'hello' } }, 's1');
            expect(result.serverId).toEqual('demo');
            expect(result.tool).toEqual('echo');
            expect(result.content[0].text).toEqual('echo:hello');
            expect(client.calls).toEqual([{ name: 'echo', args: { value: 'hello' } }]);
        } finally {
            await ctx.close();
        }
    }

    @Test('manifest-backed MCP tools skip bootstrap discovery')
    async manifestBackedMcpToolsSkipBootstrapDiscovery() {
        const client = new FakeMcpClient();
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{
                    id: 'demo',
                    client,
                    tools: [{
                        name: 'echo',
                        description: 'Echo input back.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                value: { type: 'string' }
                            },
                            required: ['value']
                        }
                    }]
                }]
            })]
        });
        try {
            const registry = ctx.get(ToolRegistry);
            expect(client.listCalls).toEqual(0);
            const tool = registry.getToolDefinitions().find(def => def.name === 'mcp.demo.echo');
            expect(tool).toBeTruthy();
            await registry.activateTool('s1', 'mcp.demo.echo');
            await registry.invoke('mcp.demo.echo', { value: 'hello' }, 's1');
            expect(client.listCalls).toEqual(0);
            expect(client.calls).toEqual([{ name: 'echo', args: { value: 'hello' } }]);
        } finally {
            await ctx.close();
        }
    }

    @Test('manifest-backed MCP tools expose capability bundle metadata')
    async manifestBackedMcpToolsExposeCapabilityBundleMetadata() {
        const ctx = await Application.run(AgentModule, {
            providers: [...provideMcpTools({
                servers: [{
                    id: 'demo',
                    client: new FakeMcpClient(),
                    tools: [{
                        name: 'echo',
                        description: 'Echo input back.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                value: { type: 'string' }
                            },
                            required: ['value']
                        }
                    }]
                }]
            })]
        });
        try {
            const bundles = ctx.get(AGENT_TOOL_BUNDLES, []) as any[];
            const bundle = bundles.find(item => item.name === 'mcp:demo');
            expect(bundle).toBeTruthy();
            expect(bundle.tools).toEqual(['mcp.demo.echo']);
            expect(bundle.source).toEqual('mcp');
            expect(bundle.providerId).toEqual('@tsdi/agent-tools/mcp');
            expect(bundle.deferredActivation).toEqual(true);
            expect(bundle.activation).toEqual({ kind: 'deferred', scope: 'session' });
            expect(bundle.sessionScoped).toEqual(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('invalid MCP server configuration is rejected')
    async invalidMcpServerConfigurationIsRejected() {
        let error: Error | undefined;
        try {
            await Application.run(AgentModule, {
                providers: [...provideMcpTools({
                    servers: [{ id: '', client: new FakeMcpClient() }]
                })]
            });
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('id must be a non-empty string');
    }
}
