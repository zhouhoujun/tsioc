import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { AgentMcpServerOptions, McpClient, McpJsonRpcRequest, McpJsonRpcResponse, McpToolCallResult, McpToolDescriptor, ResolvedAgentMcpOptions } from './types';

export class StdioMcpClient implements McpClient {
    private process?: ChildProcessWithoutNullStreams;
    private started = false;
    private closed = false;
    private requestId = 1;
    private buffer = Buffer.alloc(0);
    private pending = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void; timer?: NodeJS.Timeout; }>();
    private initialized?: Promise<void>;

    constructor(
        private server: AgentMcpServerOptions,
        private options: ResolvedAgentMcpOptions
    ) {
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
            await this.request('initialize', {
                protocolVersion: this.options.protocolVersion,
                capabilities: {},
                clientInfo: this.options.clientInfo
            });
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
            this.failAll(new Error(`MCP server '${this.server.id}' exited (${code ?? 'null'}${signal ? `, ${signal}` : ''}).`));
            this.process = undefined;
            this.started = false;
        });
        this.started = true;
        this.closed = false;
    }

    private onData(chunk: Buffer): void {
        try {
            this.buffer = Buffer.concat([this.buffer, chunk]);
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
        this.ensureStarted();
        const id = this.requestId++;
        const timeoutMs = this.server.timeoutMs ?? 15000;
        const result = new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                this.initialized = undefined;
                reject(new Error(`MCP request '${method}' timed out for server '${this.server.id}'.`));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
        });
        this.write({ jsonrpc: '2.0', id, method, params });
        return result;
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
        this.process.stdin.write(Buffer.concat([header, body]));
    }

    private failAll(error: Error): void {
        this.pending.forEach(entry => {
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            entry.reject(error);
        });
        this.pending.clear();
        this.initialized = undefined;
    }

    private failAndClose(error: Error): void {
        this.failAll(error);
        this.buffer = Buffer.alloc(0);
        if (this.process && !this.process.killed) {
            this.process.kill();
        }
        this.process = undefined;
        this.started = false;
    }
}
