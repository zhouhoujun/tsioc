import { AgentMcpServerOptions, McpClient, McpConnectionStatus, McpJsonRpcRequest, McpJsonRpcResponse, McpOAuthToken, McpPromptDescriptor, McpResourceDescriptor, McpToolCallResult, McpToolDescriptor, ResolvedAgentMcpOptions, resolveNegotiatedProtocolVersion } from './types';
import { McpOAuthClient } from './mcp-oauth';

const JSON_RPC_VERSION = '2.0';

export class McpTransportError extends Error {
    readonly status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'McpTransportError';
        this.status = status;
    }
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timer?: NodeJS.Timeout;
}

/**
 * MCP client over the Streamable HTTP transport (MCP spec 2026-07-28).
 *
 * Uses POST JSON-RPC with `Accept: application/json, text/event-stream` and
 * honors `Mcp-Session-Id` server sessions. When the server requires OAuth and
 * an {@link McpOAuthClient} is available, requests are retried once with a
 * resolved access token on 401 responses.
 */
export class StreamableHttpMcpClient implements McpClient {
    private requestId = 1;
    private sessionId?: string;
    private initialized?: Promise<void>;
    private closed = false;
    private negotiatedVersionValue?: string;
    private instructionsValue?: string;
    private readonly pending = new Map<number, PendingRequest>();
    private readonly fetchImpl: typeof fetch;
    private oauthAttempted = false;
    private reconnectCount = 0;
    private reconnecting?: Promise<void>;
    private reconnectInProgress = false;

    constructor(
        private server: AgentMcpServerOptions,
        private options: ResolvedAgentMcpOptions,
        private oauth?: McpOAuthClient
    ) {
        this.fetchImpl = globalThis.fetch;
    }

    getEndpoint(): string {
        return this.server.url ?? '';
    }

    hasSession(): boolean {
        return !!this.sessionId;
    }

    negotiatedVersion(): string | undefined {
        return this.negotiatedVersionValue;
    }

    getConnectionStatus(): McpConnectionStatus {
        return {
            connected: !this.closed,
            reconnectCount: this.reconnectCount
        };
    }

    getInstructions(): string | undefined {
        return this.instructionsValue;
    }

    async listTools(): Promise<McpToolDescriptor[]> {
        await this.ensureInitialized();
        const tools: McpToolDescriptor[] = [];
        let cursor: string | undefined;
        do {
            const result = await this.request<{ tools?: McpToolDescriptor[]; nextCursor?: string; }>('tools/list', cursor ? { cursor } : undefined);
            tools.push(...(result?.tools ?? []));
            cursor = result?.nextCursor;
        } while (cursor);
        return tools;
    }

    async listResources(): Promise<McpResourceDescriptor[]> {
        await this.ensureInitialized();
        const resources: McpResourceDescriptor[] = [];
        let cursor: string | undefined;
        do {
            const result = await this.request<{ resources?: McpResourceDescriptor[]; nextCursor?: string }>('resources/list', cursor ? { cursor } : undefined)
                .catch(() => ({ resources: [] as McpResourceDescriptor[] }));
            resources.push(...(result?.resources ?? []));
            cursor = (result as { nextCursor?: string } | undefined)?.nextCursor;
        } while (cursor);
        return resources;
    }

    async listPrompts(): Promise<McpPromptDescriptor[]> {
        await this.ensureInitialized();
        const prompts: McpPromptDescriptor[] = [];
        let cursor: string | undefined;
        do {
            const result = await this.request<{ prompts?: McpPromptDescriptor[]; nextCursor?: string }>('prompts/list', cursor ? { cursor } : undefined)
                .catch(() => ({ prompts: [] as McpPromptDescriptor[] }));
            prompts.push(...(result?.prompts ?? []));
            cursor = (result as { nextCursor?: string } | undefined)?.nextCursor;
        } while (cursor);
        return prompts;
    }

    async callTool(name: string, args?: Record<string, any>): Promise<McpToolCallResult> {
        await this.ensureInitialized();
        const result = await this.request<McpToolCallResult>('tools/call', args == null ? { name } : { name, arguments: args });
        return result ?? {};
    }

    async close(): Promise<void> {
        this.closed = true;
        this.initialized = undefined;
        this.negotiatedVersionValue = undefined;
        const error = new Error(`MCP server '${this.server.id}' closed.`);
        this.pending.forEach(entry => {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(error);
        });
        this.pending.clear();
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) {
            return this.initialized;
        }
        this.initialized = (async () => {
            const response = await this.post<McpJsonRpcResponse>('initialize', {
                protocolVersion: this.options.protocolVersion,
                capabilities: {},
                clientInfo: this.options.clientInfo
            }, true);
            if (response.error) {
                throw new Error(response.error.message || `MCP initialize failed for server '${this.server.id}'.`);
            }
            this.negotiatedVersionValue = resolveNegotiatedProtocolVersion(response.result?.protocolVersion);
            this.instructionsValue = (response.result as Record<string, any>)?.serverInfo?.instructions;
            await this.notify('notifications/initialized');
        })().catch(err => {
            this.initialized = undefined;
            throw err;
        });
        return this.initialized;
    }

    private async request<T = any>(method: string, params?: Record<string, any>): Promise<T> {
        const id = this.requestId++;
        const response = await this.post<McpJsonRpcResponse>(method, params, true, id);
        if (response.error) {
            throw new Error(response.error.message || `MCP request '${method}' failed for server '${this.server.id}'.`);
        }
        return response.result as T;
    }

    private async notify(method: string, params?: Record<string, any>): Promise<void> {
        await this.post(method, params, false);
    }

    private async post<T>(
        method: string,
        params: Record<string, any> | undefined,
        expectId: boolean,
        explicitId?: number
    ): Promise<T> {
        const id = expectId ? (explicitId ?? this.requestId++) : undefined;
        const message: McpJsonRpcRequest = {
            jsonrpc: JSON_RPC_VERSION,
            ...(typeof id === 'number' ? { id } : {}),
            method,
            ...(params !== undefined ? { params } : {})
        };
        const timeoutMs = this.server.timeoutMs ?? 30000;
        return this.sendWithReconnect(message, timeoutMs);
    }

    private async sendWithReconnect(message: McpJsonRpcRequest, timeoutMs: number): Promise<any> {
        if (!this.reconnectEnabled() || this.reconnectInProgress) {
            return this.sendWithAuthRetry(message, timeoutMs);
        }
        let attempt = 0;
        while (true) {
            try {
                return await this.sendWithAuthRetry(message, timeoutMs);
            } catch (err) {
                if (!(err instanceof McpTransportError)) {
                    throw err;
                }
                attempt++;
                if (attempt >= this.maxAttempts()) {
                    throw err;
                }
                try {
                    await this.reconnect();
                } catch (reconnectErr) {
                    throw err;
                }
            }
        }
    }

    private async reconnect(): Promise<void> {
        if (this.reconnecting) {
            return this.reconnecting;
        }
        this.reconnecting = this.doReconnect();
        try {
            await this.reconnecting;
        } finally {
            this.reconnecting = undefined;
        }
    }

    private async doReconnect(): Promise<void> {
        this.sessionId = undefined;
        this.initialized = undefined;
        this.negotiatedVersionValue = undefined;
        this.reconnectInProgress = true;
        this.reconnectCount++;
        try {
            await this.ensureInitialized();
        } finally {
            this.reconnectInProgress = false;
        }
    }

    private reconnectEnabled(): boolean {
        return this.server.autoReconnect !== false;
    }

    private maxAttempts(): number {
        return this.server.reconnectMaxAttempts ?? 5;
    }

    private async sendWithAuthRetry(message: McpJsonRpcRequest, timeoutMs: number): Promise<any> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await this.performFetch(message, controller);
            if (response.status === 401 && this.oauth && !this.oauthAttempted) {
                this.oauthAttempted = true;
                try {
                    const token = await this.oauth.getAccessToken(this.server);
                    this.setOAuthToken(token);
                    const retry = await this.performFetch(message, controller);
                    return this.consumeResponse(retry, message);
                } finally {
                    this.oauthAttempted = false;
                }
            }
            return this.consumeResponse(response, message);
        } finally {
            clearTimeout(timer);
        }
    }

    private async performFetch(message: McpJsonRpcRequest, controller: AbortController): Promise<Response> {
        try {
            return await this.fetchImpl(this.requireEndpoint(), {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(message),
                signal: controller.signal
            });
        } catch (err) {
            if (err instanceof McpTransportError) {
                throw err;
            }
            if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
                throw err;
            }
            throw new McpTransportError(`MCP HTTP request to '${this.server.id}' failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    private oauthToken?: McpOAuthToken;

    private setOAuthToken(token: McpOAuthToken): void {
        this.oauthToken = token;
    }

    private async consumeResponse(response: Response, message: McpJsonRpcRequest): Promise<any> {
        if (!response.ok) {
            throw new McpTransportError(`MCP HTTP request to '${this.server.id}' failed (${response.status} ${response.statusText}).`, response.status);
        }
        const sessionId = response.headers.get('mcp-session-id');
        if (sessionId) {
            this.sessionId = sessionId;
        }
        const contentType = response.headers.get('content-type') ?? '';
        const body = await response.text();
        if (contentType.includes('text/event-stream')) {
            return this.parseEventStream(body, message.id);
        }
        if (typeof message.id !== 'number') {
            return undefined;
        }
        const parsed = JSON.parse(body) as McpJsonRpcResponse;
        return parsed ?? undefined;
    }

    private parseEventStream(body: string, requestId?: number): McpJsonRpcResponse | undefined {
        const events = body.split(/\r?\n\r?\n/);
        for (const event of events) {
            const dataLines = event
                .split(/\r?\n/)
                .filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trim())
                .filter(Boolean);
            if (!dataLines.length) {
                continue;
            }
            const payload = dataLines.join('\n');
            try {
                const message = JSON.parse(payload) as McpJsonRpcResponse;
                if (typeof message.id === 'number') {
                    if (requestId === undefined || message.id === requestId) {
                        return message;
                    }
                }
            } catch (err) {
                continue;
            }
        }
        if (requestId !== undefined) {
            throw new Error(`MCP request '${requestId}' received no matching response in the event stream from '${this.server.id}'.`);
        }
        return undefined;
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
        };
        if (this.sessionId) {
            headers['Mcp-Session-Id'] = this.sessionId;
        }
        if (this.oauthToken?.accessToken) {
            headers['Authorization'] = `Bearer ${this.oauthToken.accessToken}`;
        } else if (this.server.auth?.type === 'bearer' && this.server.auth.bearerToken) {
            headers['Authorization'] = `Bearer ${this.server.auth.bearerToken}`;
        }
        if (this.server.headers) {
            Object.entries(this.server.headers).forEach(([name, value]) => {
                headers[name] = value;
            });
        }
        return headers;
    }

    private requireEndpoint(): string {
        if (!this.server.url) {
            throw new Error(`MCP server '${this.server.id}' requires a url when no client is provided.`);
        }
        return this.server.url;
    }
}
