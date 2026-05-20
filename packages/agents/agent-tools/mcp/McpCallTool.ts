import { AgentTool, AgentToolContext, ToolRegistry } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { LocalMcpClientRegistry } from './LocalMcpClientRegistry';
import { toMcpToolName } from './types';

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

    constructor(
        private registry: LocalMcpClientRegistry,
        @Optional() @Inject(ApplicationContext, { defaultValue: null }) private app?: ApplicationContext | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const serverId = this.requireString(input?.serverId, 'serverId');
        const name = this.requireString(input?.name, 'name');
        const args = this.normalizeArguments(input?.arguments);
        await this.ensureToolIsCallable(context.sessionId, serverId, name);
        const result = await this.registry.callTool(serverId, name, args);
        return {
            serverId,
            tool: name,
            ...result
        };
    }

    private async ensureToolIsCallable(sessionId: string, serverId: string, name: string): Promise<void> {
        if (!this.isManifestBackedTool(serverId, name)) {
            return;
        }
        const fullName = toMcpToolName(serverId, name);
        const tools = this.resolveRegistry();
        if (!tools) {
            throw new Error(`Tool '${fullName}' requires a tool registry to verify session activation.`);
        }
        if (!tools.getToolDefinition(fullName)) {
            throw new Error(`Tool '${fullName}' is not registered.`);
        }
        if (!(await tools.isToolActive(sessionId, fullName))) {
            throw new Error(`Tool '${fullName}' is not activated for this session.`);
        }
    }

    private isManifestBackedTool(serverId: string, name: string): boolean {
        return this.registry.getServers().some(server => server.id === serverId && !!server.tools?.some(tool => tool.name === name));
    }

    private resolveRegistry(): Pick<ToolRegistry, 'getToolDefinition' | 'isToolActive'> | null {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(ToolRegistry, null) as ToolRegistry | null
            : null;
        if (!registry || typeof registry.getToolDefinition !== 'function' || typeof registry.isToolActive !== 'function') {
            return null;
        }
        return registry;
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
