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

/**
 * OAuth token persisted for a remote MCP server.
 */
export interface McpOAuthToken {
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresAt?: number;
    scope?: string;
}

/**
 * Per-server authentication configuration for remote (Streamable HTTP) MCP servers.
 */
export interface McpServerAuthOptions {
    type: 'none' | 'bearer' | 'oauth';
    /** Static bearer token used as `Authorization: Bearer <token>`. */
    bearerToken?: string;
    /** OAuth client id used for authorization. */
    clientId?: string;
    /** OAuth scope requested during authorization. */
    scope?: string;
    /** Explicit token endpoint, skipping RFC 8414 discovery. */
    tokenEndpoint?: string;
    /** Explicit authorization endpoint, skipping RFC 8414 discovery. */
    authorizationEndpoint?: string;
    /** Explicit device authorization endpoint, skipping RFC 8414 discovery. */
    deviceAuthorizationEndpoint?: string;
}

export interface AgentMcpServerOptions {
    id: string;
    title?: string;
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    /** Streamable HTTP endpoint for remote servers. */
    url?: string;
    /** Static headers applied to every Streamable HTTP request. */
    headers?: Record<string, string>;
    auth?: McpServerAuthOptions;
    timeoutMs?: number;
    client?: McpClient;
    tools?: McpToolDescriptor[];
    allowedTools?: string[];
}

export interface AgentMcpOptions {
    servers?: AgentMcpServerOptions[];
    protocolVersion?: string;
    clientInfo?: McpClientInfo;
    providerId?: string;
    /** Path to the OAuth credential store; defaults to `<agent-root>/mcp-credentials.json`. */
    credentialsPath?: string;
}

export interface ResolvedAgentMcpOptions extends AgentMcpOptions {
    servers: AgentMcpServerOptions[];
    protocolVersion: string;
    clientInfo: McpClientInfo;
    providerId: string;
    credentialsPath: string;
}

/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata (subset used by MCP clients).
 */
export interface McpOAuthAuthorizationServerMetadata {
    issuer?: string;
    authorization_endpoint?: string;
    token_endpoint?: string;
    device_authorization_endpoint?: string;
    code_challenge_methods_supported?: string[];
    scopes_supported?: string[];
    resource?: string;
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
    providerId: '@tsdi/agent-tools/mcp',
    credentialsPath: ''
};

export function mergeAgentMcpOptions(options?: AgentMcpOptions): ResolvedAgentMcpOptions {
    const credentialsPath = options?.credentialsPath?.trim()
        || resolveDefaultMcpCredentialsPath();
    return {
        ...defaultAgentMcpOptions,
        ...(options ?? {}),
        servers: (options?.servers ?? defaultAgentMcpOptions.servers).slice(),
        clientInfo: {
            ...defaultAgentMcpOptions.clientInfo,
            ...(options?.clientInfo ?? {})
        },
        providerId: options?.providerId ?? defaultAgentMcpOptions.providerId,
        protocolVersion: options?.protocolVersion ?? defaultAgentMcpOptions.protocolVersion,
        credentialsPath
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
        if (!server.client && !server.command && !server.url) {
            throw new Error(`Invalid MCP server configuration for '${id}': command, url, or client is required.`);
        }
        if (server.command && server.url) {
            throw new Error(`Invalid MCP server configuration for '${id}': command and url are mutually exclusive.`);
        }
        if (server.url && !/^https?:\/\/.+/.test(server.url.trim())) {
            throw new Error(`Invalid MCP server configuration for '${id}': url must be an absolute http(s) URL.`);
        }
        if (server.auth?.type === 'bearer' && !server.auth.bearerToken) {
            throw new Error(`Invalid MCP server configuration for '${id}': bearer auth requires a bearerToken.`);
        }
        if (server.auth?.type === 'oauth' && !server.auth.clientId) {
            throw new Error(`Invalid MCP server configuration for '${id}': oauth auth requires a clientId.`);
        }
    });
}

/**
 * Resolve the default OAuth credential store path (see {@link mergeAgentMcpOptions}).
 */
export function resolveDefaultMcpCredentialsPath(): string {
    const home = process.env.HOME || process.cwd();
    return `${home}/.tsdi-agent/mcp-credentials.json`;
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
