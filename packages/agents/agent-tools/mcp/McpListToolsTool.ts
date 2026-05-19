import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { LocalMcpClientRegistry } from './LocalMcpClientRegistry';
import { toMcpToolName, toMcpToolset } from './types';

@Injectable()
export class McpListToolsTool implements AgentTool {
    name = 'mcp.list_tools';
    description = 'List tools exposed by a configured MCP server on demand.';
    inputSchema = {
        type: 'object',
        properties: {
            serverId: { type: 'string' }
        },
        required: ['serverId']
    };
    toolset = 'mcp';
    source = 'mcp';
    execution = { readOnly: true };
    activation = { kind: 'always' as const, scope: 'global' as const };
    provenance = { origin: 'mcp' as const, providerId: '@tsdi/agent-tools/mcp', sessionScoped: false };

    constructor(private registry: LocalMcpClientRegistry) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const serverId = this.requireServerId(input?.serverId);
        const tools = await this.registry.listServerTools(serverId);
        return {
            serverId,
            tools: tools.map(tool => ({
                name: tool.name,
                fullName: toMcpToolName(serverId, tool.name),
                description: tool.description || tool.title || `MCP tool '${tool.name}'.`,
                inputSchema: tool.inputSchema,
                toolset: toMcpToolset(serverId),
                source: 'mcp'
            }))
        };
    }

    private requireServerId(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid mcp.list_tools input: serverId must be a non-empty string.');
        }
        return value.trim();
    }
}
