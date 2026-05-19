import { AgentCapabilityBundle, AgentTool, AgentToolDefinition } from '@tsdi/agent';

export interface McpClientInfo {
    name: string;
    version: string;
}

export interface McpJsonRpcRequest {
    jsonrpc: '2.0';
    id?: number;
    method: string;
    params?: Record<string, any>;
}

export interface McpJsonRpcResponse<T = any> {
    jsonrpc: '2.0';
    id?: number;
    result?: T;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

export interface McpToolDescriptor {
    name: string;
    title?: string;
    description?: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    annotations?: Record<string, any>;
}

export interface McpToolCallResult {
    content?: Array<Record<string, any>>;
    structuredContent?: any;
    isError?: boolean;
    [key: string]: any;
}

export interface McpClient {
    listTools(): Promise<McpToolDescriptor[]>;
    callTool(name: string, args?: Record<string, any>): Promise<McpToolCallResult>;
    close?(): Promise<void> | void;
}

export interface AgentMcpServerOptions {
    id: string;
    title?: string;
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    client?: McpClient;
    tools?: McpToolDescriptor[];
}

export interface AgentMcpOptions {
    servers?: AgentMcpServerOptions[];
    protocolVersion?: string;
    clientInfo?: McpClientInfo;
    providerId?: string;
}

export interface ResolvedAgentMcpOptions extends AgentMcpOptions {
    servers: AgentMcpServerOptions[];
    protocolVersion: string;
    clientInfo: McpClientInfo;
    providerId: string;
}

export interface McpResolvedToolRef {
    server: AgentMcpServerOptions;
    tool: McpToolDescriptor;
}

export interface McpCapabilityBundle extends AgentCapabilityBundle {
    source: 'mcp';
}

export interface McpAgentTool extends AgentTool {
    canonicalName: string;
    source: 'mcp';
    toolset: string;
}

export const defaultAgentMcpOptions: ResolvedAgentMcpOptions = {
    servers: [],
    protocolVersion: '2025-06-18',
    clientInfo: {
        name: 'tsdi-agent-tools-mcp',
        version: '6.0.31'
    },
    providerId: '@tsdi/agent-tools/mcp'
};

export function mergeAgentMcpOptions(options?: AgentMcpOptions): ResolvedAgentMcpOptions {
    return {
        ...defaultAgentMcpOptions,
        ...(options ?? {}),
        servers: (options?.servers ?? defaultAgentMcpOptions.servers).slice(),
        clientInfo: {
            ...defaultAgentMcpOptions.clientInfo,
            ...(options?.clientInfo ?? {})
        },
        providerId: options?.providerId ?? defaultAgentMcpOptions.providerId,
        protocolVersion: options?.protocolVersion ?? defaultAgentMcpOptions.protocolVersion
    };
}

export function validateAgentMcpOptions(options: ResolvedAgentMcpOptions): void {
    const seen = new Set<string>();
    options.servers.forEach(server => {
        const id = server.id?.trim();
        if (!id) {
            throw new Error('Invalid MCP server configuration: id must be a non-empty string.');
        }
        if (!/^[A-Za-z0-9_-]+$/.test(id)) {
            throw new Error(`Invalid MCP server configuration for '${id}': id must use letters, numbers, underscore, or dash.`);
        }
        if (seen.has(id)) {
            throw new Error(`Invalid MCP server configuration: duplicate server id '${id}'.`);
        }
        seen.add(id);
        if (!server.client && !server.command) {
            throw new Error(`Invalid MCP server configuration for '${id}': command or client is required.`);
        }
    });
}

export function toMcpIdentifier(value: string): string {
    const normalized = value.trim().replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (!normalized) {
        throw new Error(`Invalid MCP identifier '${value}'.`);
    }
    return normalized;
}

export function toMcpToolName(serverId: string, toolName: string): string {
    return `mcp.${toMcpIdentifier(serverId)}.${toMcpIdentifier(toolName)}`;
}

export function toMcpToolset(serverId: string): string {
    return `mcp:${serverId}`;
}

export function toMcpBundle(serverId: string, tools: AgentToolDefinition[], providerId: string): McpCapabilityBundle {
    return {
        name: toMcpToolset(serverId),
        description: `MCP tools provided by server '${serverId}'.`,
        tools: tools.map(tool => tool.name),
        defaultEnabled: true,
        deferredActivation: true,
        enabled: tools.length > 0,
        source: 'mcp',
        providerId,
        activation: {
            kind: 'deferred',
            scope: 'session'
        },
        sessionScoped: true
    };
}
