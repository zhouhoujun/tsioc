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
        provider(injector: Injector) {
            const registry = injector.get(LocalMcpClientRegistry);
            const providerId = registry.getProviderId();
            const resolved = registry.getStaticManifestToolRefs();
            return toProviders(AGENT_TOOLS, resolved.map(ref => new McpServerTool(registry, ref.server, ref.tool, providerId)), true);
        }
    };
}

export function provideResolvedMcpToolBundles(): Provider {
    return {
        provider(injector: Injector) {
            const registry = injector.get(LocalMcpClientRegistry);
            const providerId = registry.getProviderId();
            const grouped = new Map<string, McpServerTool[]>();
            registry.getStaticManifestServers().forEach(server => {
                const tools = (server.tools ?? []).map(tool => new McpServerTool(registry, server, tool, providerId));
                if (tools.length) {
                    grouped.set(server.id, tools);
                }
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
