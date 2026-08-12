import { AgentConsoleAppRpc } from '@tsdi/agent';

export interface HttpAgentConsoleAppRpcOptions {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}

interface RpcEnvelope {
    jsonrpc: '2.0';
    id?: string | number | null;
    method?: string;
    params?: any;
    result?: any;
    error?: { code: number; message: string; data?: any };
}

const DEFAULT_TIMEOUT_MS = 300_000;

function resolveFetch(options: HttpAgentConsoleAppRpcOptions): typeof fetch {
    return options.fetchImpl
        ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch | undefined)
        ?? (() => {
            throw new Error('fetch is not available; provide fetchImpl in HttpAgentConsoleAppRpcOptions');
        }) as unknown as typeof fetch;
}

function buildHeaders(options: HttpAgentConsoleAppRpcOptions): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }
    return headers;
}

function requestUrl(options: HttpAgentConsoleAppRpcOptions): string {
    const base = String(options.baseUrl || '').replace(/\/+$/, '');
    return `${base}/rpc`;
}

function streamUrl(options: HttpAgentConsoleAppRpcOptions): string {
    const base = String(options.baseUrl || '').trim().replace(/\/+$/, '');
    return `${base}/rpc/stream`;
}

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal | undefined; cancel: () => void } {
    if (!timeoutMs || timeoutMs <= 0 || typeof AbortController === 'undefined') {
        return { signal: undefined, cancel: () => undefined };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return {
        signal: controller.signal,
        cancel: () => clearTimeout(timer)
    };
}

async function parseJsonResponse(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function toRpcError(payload: RpcEnvelope | undefined): Error | undefined {
    if (!payload?.error) {
        return undefined;
    }
    const error = new Error(payload.error.message ?? `RPC error ${payload.error.code}`);
    (error as any).code = payload.error.code;
    (error as any).data = payload.error.data;
    return error;
}

/**
 * `AgentConsoleAppRpc` implementation backed by HTTP JSON-RPC.
 * Works in any fetch-capable environment (browser / node >= 18);
 * `stream` consumes the gateway's NDJSON `POST /rpc/stream` endpoint.
 */
export class HttpAgentConsoleAppRpc implements AgentConsoleAppRpc {
    protected options: HttpAgentConsoleAppRpcOptions;
    protected fetchImpl: typeof fetch;

    constructor(options: HttpAgentConsoleAppRpcOptions) {
        this.options = options;
        this.fetchImpl = resolveFetch(options);
    }

    get baseUrl(): string {
        return this.options.baseUrl;
    }

    setToken(token?: string): void {
        this.options = { ...this.options, token };
    }

    async request(method: string, params?: any, context?: any): Promise<any> {
        const timeout = Number(this.options.timeoutMs || context?.timeoutMs || DEFAULT_TIMEOUT_MS);
        const timeoutCtl = createTimeoutSignal(timeout);
        try {
            const response = await this.fetchImpl(requestUrl(this.options), {
                method: 'POST',
                headers: buildHeaders(this.options),
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: this.nextRequestId(),
                    method,
                    params: params ?? {}
                }),
                signal: timeoutCtl.signal
            });
            if (!response.ok) {
                const detail = await parseJsonResponse(response);
                const message = typeof detail === 'object' && detail && typeof (detail as any).error === 'string'
                    ? (detail as any).error
                    : `HTTP ${response.status}`;
                throw new Error(message);
            }
            const payload = await parseJsonResponse(response) as RpcEnvelope | undefined;
            const rpcError = toRpcError(payload);
            if (rpcError) {
                throw rpcError;
            }
            return payload?.result;
        } finally {
            timeoutCtl.cancel();
        }
    }

    async *stream(method: string, params?: any, context?: any): AsyncGenerator<any, void, void> {
        const timeout = Number(this.options.timeoutMs || context?.timeoutMs || DEFAULT_TIMEOUT_MS);
        const timeoutCtl = createTimeoutSignal(timeout);
        try {
            const response = await this.fetchImpl(streamUrl(this.options), {
                method: 'POST',
                headers: buildHeaders(this.options),
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: this.nextRequestId(),
                    method,
                    params: params ?? {}
                }),
                signal: timeoutCtl.signal
            });
            if (!response.ok) {
                const detail = await parseJsonResponse(response);
                const message = typeof detail === 'object' && detail && typeof (detail as any).error === 'string'
                    ? (detail as any).error
                    : `HTTP ${response.status}`;
                throw new Error(message);
            }
            const body = response.body as ReadableStream<Uint8Array> | null;
            if (!body) {
                return;
            }
            const reader = body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                let newlineIndex: number;
                while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (!line) {
                        continue;
                    }
                    const message = this.parseLine(line);
                    if (!message) {
                        continue;
                    }
                    if (message.error) {
                        const error = new Error(message.error.message ?? `RPC error ${message.error.code}`);
                        (error as any).code = message.error.code;
                        throw error;
                    }
                    if (message.method === 'run.turn_stream.chunk') {
                        const p = message.params ?? {};
                        yield {
                            type: p.chunkType,
                            content: p.content,
                            usage: p.usage,
                            eventType: p.eventType,
                            label: p.label,
                            status: p.status,
                            toolName: p.toolName
                        };
                        continue;
                    }
                    if ('result' in message) {
                        yield {
                            type: 'done',
                            ...message.result
                        };
                    }
                }
            }
            const remainder = buffer.trim();
            if (remainder) {
                const message = this.parseLine(remainder);
                if (message?.error) {
                    const error = new Error(message.error.message ?? `RPC error ${message.error.code}`);
                    (error as any).code = message.error.code;
                    throw error;
                }
                if (message && 'result' in message) {
                    yield {
                        type: 'done',
                        ...message.result
                    };
                }
            }
        } finally {
            timeoutCtl.cancel();
        }
    }

    protected nextRequestId(): number {
        return Date.now() + Math.floor(Math.random() * 100_000);
    }

    protected parseLine(line: string): RpcEnvelope | undefined {
        try {
            const parsed = JSON.parse(line);
            return parsed && typeof parsed === 'object' ? parsed as RpcEnvelope : undefined;
        } catch {
            return undefined;
        }
    }
}

export function createHttpAgentConsoleAppRpc(options: HttpAgentConsoleAppRpcOptions): AgentConsoleAppRpc {
    return new HttpAgentConsoleAppRpc(options);
}
