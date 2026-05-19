import { AgentToolContext } from '@tsdi/agent';
import { LocalMcpClientRegistry } from './LocalMcpClientRegistry';
import { AgentMcpServerOptions, McpAgentTool, McpToolDescriptor, toMcpToolName, toMcpToolset } from './types';

export class McpServerTool implements McpAgentTool {
    readonly name: string;
    readonly description: string;
    readonly inputSchema?: Record<string, any>;
    readonly toolset: string;
    readonly source = 'mcp' as const;
    readonly execution = { requiresSequential: true };
    readonly canonicalName: string;
    readonly tags: string[];
    readonly activation = { kind: 'deferred' as const, scope: 'session' as const };
    readonly provenance: { origin: 'mcp'; providerId: string; serverId: string; sessionScoped: true; };

    constructor(
        private readonly registry: LocalMcpClientRegistry,
        private readonly server: AgentMcpServerOptions,
        private readonly tool: McpToolDescriptor,
        providerId: string
    ) {
        this.canonicalName = tool.name;
        this.name = toMcpToolName(server.id, tool.name);
        this.description = tool.description || tool.title || `MCP tool '${tool.name}' from server '${server.id}'.`;
        this.inputSchema = tool.inputSchema;
        this.toolset = toMcpToolset(server.id);
        this.tags = ['mcp', server.id];
        this.provenance = {
            origin: 'mcp',
            providerId,
            serverId: server.id,
            sessionScoped: true
        };
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const result = await this.registry.callTool(this.server.id, this.tool.name, this.normalizeInput(input));
        return {
            serverId: this.server.id,
            tool: this.tool.name,
            ...result
        };
    }

    private normalizeInput(input: any): Record<string, any> | undefined {
        if (input == null) {
            return undefined;
        }
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error(`Invalid MCP input for '${this.name}': expected an object.`);
        }
        return input;
    }
}
