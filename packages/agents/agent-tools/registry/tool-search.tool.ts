import { AgentTool, AgentToolContext, AgentToolDefinition, ToolRegistry } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { LocalMcpClientRegistry, McpToolDescriptor, toMcpIdentifier, toMcpToolName, toMcpToolset } from '../mcp';

@Injectable()
export class ToolSearchTool implements AgentTool {
    name = 'tool_search';
    description = 'Search registered tools and optionally discover dynamic MCP tools by name, description, or toolset.';
    inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string' },
            limit: { type: 'number' },
            includeDynamicMcp: { type: 'boolean' },
            serverId: { type: 'string' }
        }
    };
    toolset = 'registry';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(ApplicationContext)
        private app?: ApplicationContext | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const query = typeof input?.query === 'string' ? input.query.trim().toLowerCase() : '';
        const limit = typeof input?.limit === 'number' && input.limit > 0 ? Math.floor(input.limit) : 20;
        const includeDynamicMcp = input?.includeDynamicMcp === true;
        const serverId = typeof input?.serverId === 'string' && input.serverId.trim() ? input.serverId.trim() : undefined;
        const registry = this.resolveRegistry();
        const matches = registry.getToolDefinitions()
            .filter((tool: any) => this.matchesQuery(tool, query))
            .slice(0, limit);
        const tools = await Promise.all(matches.map(async (tool: any) => ({
            ...(registry.getToolDefinition(tool.name, context.sessionId) ?? tool),
            active: registry.isToolActive ? await registry.isToolActive(context.sessionId, tool.name) : true
        })));
        if (tools.length >= limit || !query || !includeDynamicMcp) {
            return { tools };
        }
        const dynamicMcpTools = await this.searchDynamicMcpTools(query, limit - tools.length, registry, serverId);
        return { tools: [...tools, ...dynamicMcpTools] };
    }

    private resolveRegistry(): Pick<ToolRegistry, 'getToolDefinitions' | 'getToolDefinition' | 'isToolActive'> {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(ToolRegistry, null) as ToolRegistry | null
            : null;
        if (!registry) {
            throw new Error('tool_search requires a tool registry.');
        }
        return registry;
    }

    private matchesQuery(tool: AgentToolDefinition, query: string): boolean {
        if (!query) {
            return true;
        }
        const normalizedQuery = this.normalizeQuery(query);
        return tool.name.toLowerCase().includes(query)
            || tool.description.toLowerCase().includes(query)
            || String(tool.toolset ?? '').toLowerCase().includes(query)
            || String(tool.canonicalName ?? '').toLowerCase().includes(query)
            || !!normalizedQuery && tool.name.toLowerCase().includes(normalizedQuery)
            || !!normalizedQuery && String(tool.canonicalName ?? '').toLowerCase().includes(normalizedQuery);
    }

    private normalizeQuery(query: string): string {
        try {
            return toMcpIdentifier(query).toLowerCase();
        } catch {
            return '';
        }
    }

    private async searchDynamicMcpTools(
        query: string,
        limit: number,
        registry: Pick<ToolRegistry, 'getToolDefinitions' | 'getToolDefinition' | 'isToolActive'>,
        serverId?: string
    ): Promise<Array<AgentToolDefinition & { active: boolean; discovery: { kind: 'mcp'; serverId: string; via: 'mcp.list_tools'; }; }>> {
        const mcpRegistry = this.resolveMcpRegistry();
        if (!mcpRegistry) {
            return [];
        }
        const results: Array<AgentToolDefinition & { active: boolean; discovery: { kind: 'mcp'; serverId: string; via: 'mcp.list_tools'; }; }> = [];
        const existingNames = new Set(registry.getToolDefinitions().map(tool => tool.name));
        const servers = serverId
            ? mcpRegistry.getServers().filter(server => server.id === serverId)
            : mcpRegistry.getServers();
        for (const server of servers) {
            const serverId = server.id?.trim();
            if (!serverId) {
                continue;
            }
            let tools: McpToolDescriptor[];
            try {
                tools = await mcpRegistry.listServerTools(serverId);
            } catch {
                continue;
            }
            for (const tool of tools) {
                const definition = this.toDynamicMcpDefinition(serverId, tool);
                if (existingNames.has(definition.name) || !this.matchesQuery(definition, query)) {
                    continue;
                }
                results.push({
                    ...definition,
                    active: false,
                    discovery: {
                        kind: 'mcp',
                        serverId,
                        via: 'mcp.list_tools'
                    }
                });
                if (results.length >= limit) {
                    return results;
                }
            }
        }
        return results;
    }

    private resolveMcpRegistry(): Pick<LocalMcpClientRegistry, 'getServers' | 'listServerTools'> | null {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(LocalMcpClientRegistry, null) as Pick<LocalMcpClientRegistry, 'getServers' | 'listServerTools'> | null
            : null;
        if (!registry || typeof (registry as any).getServers !== 'function' || typeof (registry as any).listServerTools !== 'function') {
            return null;
        }
        return registry;
    }

    private toDynamicMcpDefinition(serverId: string, tool: McpToolDescriptor): AgentToolDefinition {
        return {
            name: toMcpToolName(serverId, tool.name),
            description: tool.description || tool.title || `MCP tool '${tool.name}'.`,
            inputSchema: tool.inputSchema,
            toolset: toMcpToolset(serverId),
            source: 'mcp',
            canonicalName: tool.name,
            execution: { readOnly: false, sideEffect: true, requiresSequential: true },
            activation: { kind: 'deferred', scope: 'session', activated: false },
            provenance: {
                origin: 'mcp',
                providerId: '@tsdi/agent-tools/mcp',
                serverId,
                sessionScoped: true
            }
        };
    }
}
