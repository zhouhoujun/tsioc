import { Inject, Injectable, OnDestroy, Optional } from '@tsdi/ioc';
import { AGENT_MCP_OPTIONS } from './tokens';
import { AgentMcpServerOptions, McpClient, McpResolvedToolRef, McpToolCallResult, McpToolDescriptor, ResolvedAgentMcpOptions, mergeAgentMcpOptions, toMcpToolName, validateAgentMcpOptions } from './types';
import { StdioMcpClient } from './StdioMcpClient';

@Injectable()
export class LocalMcpClientRegistry implements OnDestroy {
    private readonly options: ResolvedAgentMcpOptions;
    private readonly clients = new Map<string, McpClient>();
    private readonly toolCache = new Map<string, Promise<McpToolDescriptor[]>>();

    constructor(
        @Optional() @Inject(AGENT_MCP_OPTIONS, { defaultValue: null }) options?: any
    ) {
        this.options = mergeAgentMcpOptions(options ?? undefined);
        validateAgentMcpOptions(this.options);
    }

    getProviderId(): string {
        return this.options.providerId;
    }

    getServers(): AgentMcpServerOptions[] {
        return this.options.servers.slice();
    }

    async listServerTools(serverId: string): Promise<McpToolDescriptor[]> {
        const cached = this.toolCache.get(serverId);
        if (cached) {
            return cached;
        }
        const promise = this.getClient(serverId).listTools()
            .then(tools => this.normalizeTools(serverId, tools))
            .catch(err => {
                this.toolCache.delete(serverId);
                throw err;
            });
        this.toolCache.set(serverId, promise);
        return promise;
    }

    async listAllTools(): Promise<McpResolvedToolRef[]> {
        const refs = await Promise.all(this.getStaticManifestServers().map(async server => {
            const tools = await this.resolveServerTools(server);
            return tools.map(tool => ({ server, tool }));
        }));
        const flattened = refs.flat();
        const seen = new Map<string, string>();
        flattened.forEach(ref => {
            const resolvedName = toMcpToolName(ref.server.id, ref.tool.name);
            const existing = seen.get(resolvedName);
            if (existing) {
                throw new Error(`Duplicate MCP tool name '${resolvedName}' generated from '${existing}' and '${ref.server.id}.${ref.tool.name}'.`);
            }
            seen.set(resolvedName, `${ref.server.id}.${ref.tool.name}`);
        });
        return flattened;
    }

    async callTool(serverId: string, toolName: string, args?: Record<string, any>): Promise<McpToolCallResult> {
        const server = this.getServer(serverId);
        if (!this.isToolAllowed(server, toolName)) {
            throw new Error(`MCP tool '${serverId}.${toolName}' is not declared or allowlisted.`);
        }
        return this.getClient(serverId).callTool(toolName, args);
    }

    getStaticManifestServers(): AgentMcpServerOptions[] {
        return this.getServers().filter(server => !!server.tools?.length);
    }

    getStaticManifestToolRefs(): McpResolvedToolRef[] {
        const refs = this.getStaticManifestServers().flatMap(server =>
            this.normalizeTools(server.id, server.tools ?? []).map(tool => ({ server, tool }))
        );
        const seen = new Map<string, string>();
        refs.forEach(ref => {
            const resolvedName = toMcpToolName(ref.server.id, ref.tool.name);
            const existing = seen.get(resolvedName);
            if (existing) {
                throw new Error(`Duplicate MCP tool name '${resolvedName}' generated from '${existing}' and '${ref.server.id}.${ref.tool.name}'.`);
            }
            seen.set(resolvedName, `${ref.server.id}.${ref.tool.name}`);
        });
        return refs;
    }

    private async resolveServerTools(server: AgentMcpServerOptions): Promise<McpToolDescriptor[]> {
        if (server.tools?.length) {
            return this.normalizeTools(server.id, server.tools);
        }
        return this.listServerTools(server.id);
    }

    onDestroy(): void {
        this.clients.forEach(client => void client.close?.());
        this.clients.clear();
        this.toolCache.clear();
    }

    private normalizeTools(serverId: string, tools: McpToolDescriptor[]): McpToolDescriptor[] {
        const seen = new Set<string>();
        tools.forEach(tool => {
            const name = tool.name?.trim();
            if (!name) {
                throw new Error(`MCP server '${serverId}' returned a tool without a name.`);
            }
            if (seen.has(name)) {
                throw new Error(`MCP server '${serverId}' returned duplicate tool '${name}'.`);
            }
            seen.add(name);
            toMcpToolName(serverId, name);
        });
        return tools.slice();
    }

    private getClient(serverId: string): McpClient {
        const existing = this.clients.get(serverId);
        if (existing) {
            return existing;
        }
        const server = this.getServer(serverId);
        const client = server.client ?? new StdioMcpClient(server, this.options);
        this.clients.set(serverId, client);
        return client;
    }

    private isToolAllowed(server: AgentMcpServerOptions, toolName: string): boolean {
        const normalized = toolName.trim();
        if (!normalized) {
            return false;
        }
        if (server.tools?.some(tool => tool.name === normalized)) {
            return true;
        }
        return server.allowedTools?.includes(normalized) ?? false;
    }

    private getServer(serverId: string): AgentMcpServerOptions {
        const server = this.options.servers.find(item => item.id === serverId);
        if (!server) {
            throw new Error(`MCP server '${serverId}' is not configured.`);
        }
        return server;
    }

}
