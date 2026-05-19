import { AGENT_TOOL_BUNDLES, AGENT_TOOLS } from '@tsdi/agent';
import { Injector, Provider, toProviders } from '@tsdi/ioc';
import { LocalMcpClientRegistry } from './LocalMcpClientRegistry';
import { McpServerTool } from './McpServerTool';
import { McpListToolsTool } from './McpListToolsTool';
import { McpCallTool } from './McpCallTool';
import { AGENT_MCP_OPTIONS } from './tokens';
import { AgentMcpOptions, mergeAgentMcpOptions, toMcpBundle, validateAgentMcpOptions } from './types';

export function withAgentMcpOptions(options?: AgentMcpOptions): Provider[] {
    const resolved = mergeAgentMcpOptions(options);
    validateAgentMcpOptions(resolved);
    return [{
        provide: AGENT_MCP_OPTIONS,
        useValue: resolved
    }];
}

export function provideResolvedMcpTools(): Provider {
    return {
        async provider(injector: Injector) {
            const registry = injector.get(LocalMcpClientRegistry);
            const providerId = registry.getProviderId();
            const resolved = await registry.listAllTools();
            return toProviders(AGENT_TOOLS, resolved.map(ref => new McpServerTool(registry, ref.server, ref.tool, providerId)), true);
        }
    };
}

export function provideResolvedMcpToolBundles(): Provider {
    return {
        async provider(injector: Injector) {
            const registry = injector.get(LocalMcpClientRegistry);
            const providerId = registry.getProviderId();
            const resolved = await registry.listAllTools();
            const grouped = new Map<string, McpServerTool[]>();
            resolved.forEach(ref => {
                const tools = grouped.get(ref.server.id) ?? [];
                tools.push(new McpServerTool(registry, ref.server, ref.tool, providerId));
                grouped.set(ref.server.id, tools);
            });
            return toProviders(AGENT_TOOL_BUNDLES, Array.from(grouped.entries()).map(([serverId, tools]) => toMcpBundle(serverId, tools, providerId)), true);
        }
    };
}

export function provideMcpTools(options: AgentMcpOptions = {}): Provider[] {
    return [
        ...withAgentMcpOptions(options),
        LocalMcpClientRegistry,
        McpListToolsTool,
        McpCallTool,
        { provide: AGENT_TOOLS, useExisting: McpListToolsTool, multi: true },
        { provide: AGENT_TOOLS, useExisting: McpCallTool, multi: true },
        provideResolvedMcpTools(),
        provideResolvedMcpToolBundles()
    ];
}
