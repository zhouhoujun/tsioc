import { Provider } from '@tsdi/ioc';
import {
    MCP_SERVER_PROVIDER,
    McpServerProvider,
    McpServerToolCallResult,
    McpServerToolDescriptor
} from '@tsdi/mcp-microservice';
import { LocalMcpClientRegistry } from './LocalMcpClientRegistry';
import { AGENT_MCP_OPTIONS } from './tokens';
import { AgentMcpOptions, mergeAgentMcpOptions, validateAgentMcpOptions } from './types';

interface ResolvedToolName {
    serverId: string;
    toolName: string;
}

/**
 * Expose the agent MCP client registry as a standard MCP server provider.
 *
 * The provider lists all configured agent MCP servers' tools and forwards
 * `tools/call` to the matching server. Tools with colliding names are exposed
 * with a `<serverId>.<toolName>` alias.
 */
export class AgentMcpServerProvider implements McpServerProvider {
    private readonly toolNames = new Map<string, ResolvedToolName>();

    constructor(private readonly registry: LocalMcpClientRegistry) {
    }

    initialize(): Promise<Record<string, any>> {
        return Promise.resolve({
            protocolVersion: '2026-07-28',
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: 'tsdi-agent-mcp-service',
                version: '6.0.31'
            }
        });
    }

    async listTools(): Promise<{ tools: McpServerToolDescriptor[] }> {
        this.toolNames.clear();
        const tools: McpServerToolDescriptor[] = [];
        for (const server of this.registry.getServers()) {
            let serverTools;
            try {
                serverTools = await this.registry.listServerTools(server.id);
            } catch {
                continue;
            }
            for (const tool of serverTools) {
                let name = tool.name;
                if (this.toolNames.has(name)) {
                    name = `${server.id}.${tool.name}`;
                }
                let suffix = 1;
                while (this.toolNames.has(name)) {
                    name = `${server.id}.${tool.name}.${suffix++}`;
                }
                this.toolNames.set(name, { serverId: server.id, toolName: tool.name });
                tools.push({ ...tool, name });
            }
        }
        return { tools };
    }

    async callTool(name: string, args?: Record<string, any>): Promise<McpServerToolCallResult> {
        let resolved = this.toolNames.get(name);
        if (!resolved) {
            await this.listTools();
            resolved = this.toolNames.get(name);
        }
        if (!resolved) {
            throw new Error(`MCP tool '${name}' is not provided by any configured agent MCP server.`);
        }
        return this.registry.callTool(resolved.serverId, resolved.toolName, args);
    }

    listResources(): Promise<{ resources: [] }> {
        return Promise.resolve({ resources: [] });
    }

    listPrompts(): Promise<{ prompts: [] }> {
        return Promise.resolve({ prompts: [] });
    }
}

/**
 * Providers for serving the agent MCP client registry through
 * `@tsdi/mcp-microservice` (`McpToolController`).
 */
export function provideAgentMcpServerProvider(options?: AgentMcpOptions): Provider[] {
    const resolved = mergeAgentMcpOptions(options);
    validateAgentMcpOptions(resolved);
    return [
        { provide: AGENT_MCP_OPTIONS, useValue: resolved },
        LocalMcpClientRegistry,
        {
            provide: MCP_SERVER_PROVIDER,
            useFactory: (registry: LocalMcpClientRegistry) => new AgentMcpServerProvider(registry),
            deps: [LocalMcpClientRegistry]
        }
    ];
}
