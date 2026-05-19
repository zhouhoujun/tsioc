import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { LocalMcpClientRegistry } from './LocalMcpClientRegistry';

@Injectable()
export class McpCallTool implements AgentTool {
    name = 'mcp.call_tool';
    description = 'Call a tool from a configured MCP server by serverId and tool name.';
    inputSchema = {
        type: 'object',
        properties: {
            serverId: { type: 'string' },
            name: { type: 'string' },
            arguments: { type: 'object' }
        },
        required: ['serverId', 'name']
    };
    toolset = 'mcp';
    source = 'mcp';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };
    activation = { kind: 'always' as const, scope: 'global' as const };
    provenance = { origin: 'mcp' as const, providerId: '@tsdi/agent-tools/mcp', sessionScoped: false };

    constructor(private registry: LocalMcpClientRegistry) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const serverId = this.requireString(input?.serverId, 'serverId');
        const name = this.requireString(input?.name, 'name');
        const args = this.normalizeArguments(input?.arguments);
        const result = await this.registry.callTool(serverId, name, args);
        return {
            serverId,
            tool: name,
            ...result
        };
    }

    private normalizeArguments(value: unknown): Record<string, any> | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Invalid mcp.call_tool input: arguments must be an object.');
        }
        return value as Record<string, any>;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid mcp.call_tool input: ${field} must be a non-empty string.`);
        }
        return value.trim();
    }
}
