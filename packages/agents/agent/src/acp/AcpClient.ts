/**
 * Minimal Agent Client Protocol (ACP) client.
 *
 * The client deliberately depends only on a JSONL byte transport so it can be
 * used by a browser host, an editor extension, or a Node stdio adapter.
 */
export interface AcpTransport {
    read(listener: (chunk: string | Uint8Array) => void): void;
    write(payload: string): void | Promise<void>;
    close?(): void | Promise<void>;
}

export interface AcpClientOptions {
    clientName?: string;
    clientVersion?: string;
    protocolVersion?: number;
    capabilities?: Record<string, unknown>;
    onUpdate?: (update: AcpSessionUpdate) => void;
    /** Methods exposed by the host to the ACP agent (permissions, fs, terminal). */
    requestHandlers?: Record<string, (params: any) => unknown | Promise<unknown>>;
}

export interface AcpSessionUpdate {
    sessionId: string;
    kind: 'text' | 'tool' | 'status' | 'error' | 'raw';
    content?: string;
    tool?: { name?: string; input?: unknown; output?: unknown; status?: string };
    status?: string;
    raw: unknown;
}

export interface AcpSession {
    sessionId: string;
    cwd?: string;
    modes?: unknown;
    models?: unknown;
    raw?: unknown;
}

export interface AcpPromptResult {
    stopReason?: string;
    content?: unknown;
    raw: unknown;
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (reason?: unknown) => void;
}

function textFromContent(content: any): string | undefined {
    if (typeof content === 'string') return content;
    if (!content || typeof content !== 'object') return undefined;
    if (typeof content.text === 'string') return content.text;
    if (Array.isArray(content.content)) {
        const text = content.content.map(textFromContent).filter(Boolean).join('');
        return text || undefined;
    }
    return undefined;
}

function normalizeUpdate(params: any): AcpSessionUpdate {
    const update = params?.update ?? params ?? {};
    const sessionId = String(params?.sessionId ?? update?.sessionId ?? '');
    const type = String(update?.sessionUpdate ?? update?.type ?? update?.kind ?? '').toLowerCase();
    if (type.includes('tool')) {
        return { sessionId, kind: 'tool', tool: { name: update.toolCall?.name ?? update.name, input: update.toolCall?.input ?? update.input, output: update.toolCall?.output ?? update.output, status: update.status }, raw: params };
    }
    const text = textFromContent(update.content ?? update.delta ?? update.text);
    if (text !== undefined || type.includes('message') || type.includes('text')) {
        return { sessionId, kind: 'text', content: text ?? '', raw: params };
    }
    if (type.includes('error')) return { sessionId, kind: 'error', content: textFromContent(update.error) ?? update.message, raw: params };
    if (type.includes('status') || update.status) return { sessionId, kind: 'status', status: String(update.status ?? update.state ?? ''), raw: params };
    return { sessionId, kind: 'raw', raw: params };
}

export class AcpClient {
    private nextId = 1;
    private buffer = '';
    private decoder = new TextDecoder();
    private pending = new Map<string | number, PendingRequest>();
    private initialized = false;
    private options: AcpClientOptions;

    constructor(private transport: AcpTransport, options: AcpClientOptions = {}) {
        this.options = options;
        transport.read(chunk => this.receive(chunk));
    }

    async initialize(): Promise<any> {
        if (this.initialized) return undefined;
        const result = await this.request('initialize', {
            protocolVersion: this.options.protocolVersion ?? 1,
            clientInfo: { name: this.options.clientName ?? 'tsdi-agent', version: this.options.clientVersion ?? '6.0.31' },
            clientCapabilities: this.options.capabilities ?? {}
        });
        this.initialized = true;
        return result;
    }

    async newSession(options: { cwd?: string; mcpServers?: unknown[] } = {}): Promise<AcpSession> {
        await this.initialize();
        const raw = await this.request('session/new', { cwd: options.cwd, mcpServers: options.mcpServers ?? [] });
        return { sessionId: String(raw?.sessionId ?? raw?.id ?? ''), cwd: raw?.cwd, modes: raw?.modes, models: raw?.models, raw };
    }

    async prompt(sessionId: string, prompt: string | unknown[]): Promise<AcpPromptResult> {
        await this.initialize();
        const content = typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : prompt;
        const raw = await this.request('session/prompt', { sessionId, prompt: content });
        return { stopReason: raw?.stopReason, content: raw?.content, raw };
    }

    async cancel(sessionId: string): Promise<void> {
        await this.initialize();
        await this.notify('session/cancel', { sessionId });
    }

    async setSessionMode(sessionId: string, modeId: string): Promise<any> {
        await this.initialize();
        return this.request('session/set_mode', { sessionId, modeId });
    }

    async setSessionModel(sessionId: string, modelId: string): Promise<any> {
        await this.initialize();
        return this.request('session/set_model', { sessionId, modelId });
    }

    async close(): Promise<void> {
        for (const pending of this.pending.values()) pending.reject(new Error('ACP client closed'));
        this.pending.clear();
        await this.transport.close?.();
    }

    private request(method: string, params: unknown): Promise<any> {
        const id = this.nextId++;
        const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            Promise.resolve(this.transport.write(payload)).catch(error => {
                this.pending.delete(id);
                reject(error);
            });
        });
    }

    private async notify(method: string, params: unknown): Promise<void> {
        await this.transport.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
    }

    private receive(chunk: string | Uint8Array): void {
        this.buffer += typeof chunk === 'string' ? chunk : this.decoder.decode(chunk, { stream: true });
        while (true) {
            const end = this.buffer.indexOf('\n');
            if (end < 0) return;
            const line = this.buffer.slice(0, end).trim();
            this.buffer = this.buffer.slice(end + 1);
            if (!line) continue;
            let message: any;
            try { message = JSON.parse(line); } catch { continue; }
            if (message.method === 'session/update' || message.method === 'session/update_notification') {
                this.options.onUpdate?.(normalizeUpdate(message.params));
                continue;
            }
            if (message.method && message.id !== undefined && message.id !== null) {
                void this.handleIncomingRequest(message);
                continue;
            }
            if (message.id === undefined || message.id === null) continue;
            const pending = this.pending.get(message.id);
            if (!pending) continue;
            this.pending.delete(message.id);
            if (message.error) pending.reject(Object.assign(new Error(message.error.message ?? 'ACP request failed'), { code: message.error.code, data: message.error.data }));
            else pending.resolve(message.result);
        }
    }

    private async handleIncomingRequest(message: any): Promise<void> {
        const handler = this.options.requestHandlers?.[message.method];
        if (!handler) {
            await this.transport.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `ACP client method not found: ${message.method}` } }) + '\n');
            return;
        }
        try {
            const result = await handler(message.params);
            await this.transport.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: result ?? null }) + '\n');
        } catch (error) {
            await this.transport.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } }) + '\n');
        }
    }
}

export const acpInternals = { normalizeUpdate, textFromContent };
