import { AgentMcpServerOptions, McpClient, McpJsonRpcRequest, McpJsonRpcResponse, McpOAuthToken, McpToolCallResult, McpToolDescriptor, ResolvedAgentMcpOptions } from './types';
import { McpOAuthClient } from './mcp-oauth';

const JSON_RPC_VERSION = '2.0';

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    timer?: NodeJS.Timeout;
}

/**
 * MCP client over the Streamable HTTP transport (MCP spec 2025-06-18).
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
    private readonly pending = new Map<number, PendingRequest>();
    private readonly fetchImpl: typeof fetch;
    private oauthAttempted = false;

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

    async callTool(name: string, args?: Record<string, any>): Promise<McpToolCallResult> {
        await this.ensureInitialized();
        const result = await this.request<McpToolCallResult>('tools/call', args == null ? { name } : { name, arguments: args });
        return result ?? {};
    }

    async close(): Promise<void> {
        this.closed = true;
        this.initialized = undefined;
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
        return this.sendWithAuthRetry(message, timeoutMs);
    }

    private async sendWithAuthRetry(message: McpJsonRpcRequest, timeoutMs: number): Promise<any> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await this.fetchImpl(this.requireEndpoint(), {
                method: 'POST',
                headers: this.buildHeaders(),
                body: JSON.stringify(message),
                signal: controller.signal
            });
            if (response.status === 401 && this.oauth && !this.oauthAttempted) {
                this.oauthAttempted = true;
                try {
                    const token = await this.oauth.getAccessToken(this.server);
                    this.setOAuthToken(token);
                    const retry = await this.fetchImpl(this.requireEndpoint(), {
                        method: 'POST',
                        headers: this.buildHeaders(),
                        body: JSON.stringify(message),
                        signal: controller.signal
                    });
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

    private oauthToken?: McpOAuthToken;

    private setOAuthToken(token: McpOAuthToken): void {
        this.oauthToken = token;
    }

    private async consumeResponse(response: Response, message: McpJsonRpcRequest): Promise<any> {
        if (!response.ok) {
            throw new Error(`MCP HTTP request to '${this.server.id}' failed (${response.status} ${response.statusText}).`);
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
