import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { AgentMcpServerOptions, McpClient, McpConnectionStatus, McpJsonRpcRequest, McpJsonRpcResponse, McpPromptDescriptor, McpResourceDescriptor, McpToolCallResult, McpToolDescriptor, ResolvedAgentMcpOptions, resolveNegotiatedProtocolVersion } from './types';

export class StdioMcpClient implements McpClient {
    private process?: ChildProcessWithoutNullStreams;
    private started = false;
    private closed = false;
    private disconnected = false;
    private requestId = 1;
    private buffer = Buffer.alloc(0);
    private pending = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void; timer?: NodeJS.Timeout; }>();
    private pendingMessages = new Map<number, { method: string; params?: Record<string, any>; }>();
    private initialized?: Promise<void>;
    private negotiatedVersionValue?: string;
    private reconnectAttempts = 0;
    private reconnectCount = 0;
    private reconnecting = false;
    private reconnectTimer?: NodeJS.Timeout;

    constructor(
        private server: AgentMcpServerOptions,
        private options: ResolvedAgentMcpOptions
    ) {
    }

    negotiatedVersion(): string | undefined {
        return this.negotiatedVersionValue;
    }

    getConnectionStatus(): McpConnectionStatus {
        return {
            connected: !this.closed && !this.disconnected && this.started,
            reconnectCount: this.reconnectCount
        };
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
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        const error = new Error(`MCP server '${this.server.id}' closed.`);
        this.pending.forEach(entry => {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(error);
        });
        this.pending.clear();
        this.pendingMessages.clear();
        this.disconnected = false;
        this.reconnectAttempts = 0;
        if (this.process && !this.process.killed) {
            this.process.kill();
        }
        this.process = undefined;
        this.started = false;
        this.buffer = Buffer.alloc(0);
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) {
            return this.initialized;
        }
        this.initialized = (async () => {
            this.ensureStarted();
            const result = await this.requestInternal<{ protocolVersion?: string; capabilities?: Record<string, any> }>('initialize', {
                protocolVersion: this.options.protocolVersion,
                capabilities: {},
                clientInfo: this.options.clientInfo
            });
            this.negotiatedVersionValue = resolveNegotiatedProtocolVersion(result?.protocolVersion);
            this.notify('notifications/initialized');
        })().catch(err => {
            this.initialized = undefined;
            throw err;
        });
        return this.initialized;
    }

    private ensureStarted(): void {
        if (this.started) {
            return;
        }
        if (!this.server.command) {
            throw new Error(`MCP server '${this.server.id}' requires a command when no client is provided.`);
        }
        this.process = spawn(this.server.command, this.server.args ?? [], {
            cwd: this.server.cwd,
            env: { ...process.env, ...(this.server.env ?? {}) },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.process.stdout.on('data', chunk => this.onData(chunk));
        this.process.stderr.on('data', () => undefined);
        this.process.on('error', err => this.failAll(err));
        this.process.on('exit', (code, signal) => {
            this.process = undefined;
            this.started = false;
            const error = new Error(`MCP server '${this.server.id}' exited (${code ?? 'null'}${signal ? `, ${signal}` : ''}).`);
            if (this.closed || !this.reconnectEnabled()) {
                this.failAll(error);
            } else {
                this.disconnected = true;
                this.initialized = undefined;
                this.negotiatedVersionValue = undefined;
                this.scheduleReconnect();
            }
        });
        this.started = true;
        this.closed = false;
    }

    private onData(chunk: Buffer): void {
        try {
            this.buffer = Buffer.concat([this.buffer, chunk] as Uint8Array[]);
            while (true) {
                const headerEnd = this.buffer.indexOf('\r\n\r\n');
                if (headerEnd < 0) {
                    return;
                }
                const headerText = this.buffer.subarray(0, headerEnd).toString('utf8');
                const contentLength = this.readContentLength(headerText);
                const frameEnd = headerEnd + 4 + contentLength;
                if (this.buffer.length < frameEnd) {
                    return;
                }
                const body = this.buffer.subarray(headerEnd + 4, frameEnd).toString('utf8');
                this.buffer = this.buffer.subarray(frameEnd);
                const message = JSON.parse(body) as McpJsonRpcResponse;
                this.onMessage(message);
            }
        } catch (err) {
            this.failAndClose(err instanceof Error ? err : new Error(`Invalid MCP response from server '${this.server.id}'.`));
        }
    }

    private onMessage(message: McpJsonRpcResponse): void {
        if (typeof message.id !== 'number') {
            return;
        }
        const pending = this.pending.get(message.id);
        if (!pending) {
            return;
        }
        this.pending.delete(message.id);
        this.pendingMessages.delete(message.id);
        if (pending.timer) {
            clearTimeout(pending.timer);
        }
        if (message.error) {
            pending.reject(new Error(message.error.message || `MCP request failed for server '${this.server.id}'.`));
            return;
        }
        pending.resolve(message.result);
    }

    private readContentLength(headers: string): number {
        const match = /Content-Length:\s*(\d+)/i.exec(headers);
        if (!match) {
            throw new Error(`Invalid MCP response from server '${this.server.id}': missing Content-Length header.`);
        }
        return Number(match[1]);
    }

    private notify(method: string, params?: Record<string, any>): void {
        this.write({ jsonrpc: '2.0', method, params });
    }

    private async request<T = any>(method: string, params?: Record<string, any>): Promise<T> {
        await this.waitUntilUsable();
        return this.requestInternal<T>(method, params);
    }

    private async requestInternal<T = any>(method: string, params?: Record<string, any>): Promise<T> {
        this.ensureStarted();
        const id = this.requestId++;
        this.pendingMessages.set(id, { method, params });
        const timeoutMs = this.server.timeoutMs ?? 15000;
        const result = new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.pendingMessages.delete(id);
                this.initialized = undefined;
                reject(new Error(`MCP request '${method}' timed out for server '${this.server.id}'.`));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
        });
        this.write({ jsonrpc: '2.0', id, method, params });
        return result;
    }

    private async waitUntilUsable(): Promise<void> {
        while (!this.closed) {
            if (!this.disconnected) {
                return;
            }
            if (this.reconnectAttempts >= this.maxAttempts()) {
                throw new Error(`MCP server '${this.server.id}' is disconnected after ${this.reconnectAttempts} reconnect attempts.`);
            }
            if (!this.reconnecting && !this.reconnectTimer) {
                this.scheduleReconnect();
            }
            await sleep(25);
        }
        throw new Error(`MCP server '${this.server.id}' is closed.`);
    }

    private scheduleReconnect(): void {
        if (this.closed || this.reconnecting || this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            void this.reconnectNow();
        }, this.backoffMs());
    }

    private async reconnectNow(): Promise<void> {
        if (this.closed || this.reconnecting) {
            return;
        }
        this.reconnecting = true;
        try {
            await this.doReconnect();
        } finally {
            this.reconnecting = false;
        }
    }

    private async doReconnect(): Promise<void> {
        this.reconnectAttempts++;
        try {
            this.ensureStarted();
            const result = await this.requestInternal<{ protocolVersion?: string; capabilities?: Record<string, any> }>('initialize', {
                protocolVersion: this.options.protocolVersion,
                capabilities: {},
                clientInfo: this.options.clientInfo
            });
            this.negotiatedVersionValue = resolveNegotiatedProtocolVersion(result?.protocolVersion);
            this.notify('notifications/initialized');
            this.disconnected = false;
            this.reconnectAttempts = 0;
            this.reconnectCount++;
            this.redispatchPending();
        } catch (err) {
            if (this.process && !this.process.killed) {
                this.process.kill();
            }
            this.process = undefined;
            this.started = false;
            this.initialized = undefined;
            this.disconnected = true;
            if (this.reconnectAttempts >= this.maxAttempts()) {
                const message = err instanceof Error ? err.message : String(err);
                const attempts = this.reconnectAttempts;
                this.reconnectAttempts = 0;
                this.disconnected = false;
                this.failAll(new Error(`MCP server '${this.server.id}' reconnection failed after ${attempts} attempts: ${message}`));
            } else {
                this.scheduleReconnect();
            }
        }
    }

    private redispatchPending(): void {
        for (const [id, message] of this.pendingMessages) {
            try {
                this.write({ jsonrpc: '2.0', id, method: message.method, params: message.params });
            } catch (err) {
                return;
            }
        }
    }

    private reconnectEnabled(): boolean {
        return this.server.autoReconnect !== false;
    }

    private maxAttempts(): number {
        return this.server.reconnectMaxAttempts ?? 5;
    }

    private backoffMs(): number {
        const base = this.server.reconnectBackoffBaseMs ?? 250;
        const cap = this.server.reconnectBackoffMaxMs ?? 5000;
        return Math.min(base * Math.pow(2, this.reconnectAttempts - 1), cap);
    }

    private write(message: McpJsonRpcRequest): void {
        if (this.closed) {
            throw new Error(`MCP server '${this.server.id}' is closed.`);
        }
        if (!this.process?.stdin) {
            throw new Error(`MCP server '${this.server.id}' is not running.`);
        }
        const body = Buffer.from(JSON.stringify(message), 'utf8');
        const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
        this.process.stdin.write(Buffer.concat([header, body] as Uint8Array[]));
    }

    private failAll(error: Error): void {
        this.pending.forEach(entry => {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(error);
        });
        this.pending.clear();
        this.pendingMessages.clear();
        this.initialized = undefined;
    }

    private failAndClose(error: Error): void {
        this.buffer = Buffer.alloc(0);
        if (this.process && !this.process.killed) {
            this.process.kill();
        }
        this.process = undefined;
        this.started = false;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
