import { AgentTool, AgentToolContext, AgentToolDefinition, ToolRegistry } from '@tsdi/agent';
import { ApplicationContext } from '@tsdi/core';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { LocalMcpClientRegistry, McpToolDescriptor, toMcpToolName, toMcpToolset } from '../mcp';

@Injectable()
export class ToolInspectTool implements AgentTool {
    name = 'tool_inspect';
    description = 'Inspect the registered definition for a named tool.';
    inputSchema = {
        type: 'object',
        properties: {
            name: { type: 'string' }
        },
        required: ['name']
    };
    toolset = 'registry';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(ApplicationContext, { defaultValue: null })
        private app?: ApplicationContext | null
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const name = this.requireName(input?.name);
        const registry = this.resolveRegistry();
        const tool = registry.getToolDefinition(name, context.sessionId);
        if (tool) {
            return {
                tool,
                activated: await this.resolveActivated(registry, context.sessionId, tool)
            };
        }
        const dynamicTool = await this.inspectDynamicMcpTool(name);
        if (dynamicTool) {
            return dynamicTool;
        }
        throw new Error(`Tool '${name}' not found.`);
    }

    private resolveRegistry(): Pick<ToolRegistry, 'getToolDefinitions' | 'getToolDefinition' | 'isToolActive'> {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(ToolRegistry, null) as ToolRegistry | null
            : null;
        if (!registry) {
            throw new Error('tool_inspect requires a tool registry.');
        }
        return registry;
    }

    private async resolveActivated(
        registry: Pick<ToolRegistry, 'getToolDefinitions' | 'getToolDefinition' | 'isToolActive'>,
        sessionId: string,
        tool: AgentToolDefinition
    ): Promise<boolean> {
        if (typeof registry.isToolActive === 'function') {
            return registry.isToolActive(sessionId, tool.name);
        }
        if (!tool.activation) {
            return true;
        }
        if (tool.activation.kind === 'always') {
            return true;
        }
        return tool.activation.activated === true;
    }

    private async inspectDynamicMcpTool(
        name: string
    ): Promise<{ tool: AgentToolDefinition; activated: boolean; discovery: { kind: 'mcp'; serverId: string; via: 'mcp.call_tool'; }; } | null> {
        const parts = this.parseDynamicMcpName(name);
        if (!parts) {
            return null;
        }
        const mcpRegistry = this.resolveMcpRegistry();
        if (!mcpRegistry) {
            return null;
        }
        let tools: McpToolDescriptor[];
        try {
            tools = await mcpRegistry.listServerTools(parts.serverId);
        } catch {
            return null;
        }
        const tool = tools.find(item => toMcpToolName(parts.serverId, item.name) === name);
        if (!tool) {
            return null;
        }
        return {
            tool: this.toDynamicMcpDefinition(parts.serverId, tool),
            activated: false,
            discovery: {
                kind: 'mcp',
                serverId: parts.serverId,
                via: 'mcp.call_tool'
            }
        };
    }

    private resolveMcpRegistry(): Pick<LocalMcpClientRegistry, 'listServerTools'> | null {
        const registry = this.app && typeof (this.app as any).get === 'function'
            ? (this.app as any).get(LocalMcpClientRegistry, null) as Pick<LocalMcpClientRegistry, 'listServerTools'> | null
            : null;
        if (!registry || typeof (registry as any).listServerTools !== 'function') {
            return null;
        }
        return registry;
    }

    private parseDynamicMcpName(name: string): { serverId: string; toolName: string; } | null {
        const match = /^mcp\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(name);
        if (!match) {
            return null;
        }
        return {
            serverId: match[1],
            toolName: match[2]
        };
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

    private requireName(name: unknown): string {
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Invalid tool_inspect input: name must be a non-empty string.');
        }
        return name.trim();
    }
}
