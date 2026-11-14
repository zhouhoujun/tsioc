import type { AgentRuntime } from '../runtime/AgentRuntime';

export interface AcpServerTransport {
    read(listener: (chunk: string | Uint8Array) => void): void;
    write(payload: string): void | Promise<void>;
}

export interface AcpServerOptions {
    runtime: Pick<AgentRuntime, 'runTurn' | 'cancelTurn'> & { getMessages?(sessionId: string): Promise<any[]>; setSessionArchetype?(sessionId: string, archetype: string | null | undefined): void; setSessionModelProfile?(sessionId: string, profile: string): void };
    serverName?: string;
    serverVersion?: string;
}

interface JsonRpcRequest {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: any;
}

/**
 * Minimal Agent Client Protocol server core (newline-delimited JSON-RPC).
 * Transport and CLI wiring live in the host; this keeps the protocol mapping
 * testable and reusable by stdio, websocket or in-process hosts.
 */
export class AcpServer {
    private buffer = '';
    private initialized = false;
    private sessionCounter = 0;
    private nextRequestId = 1000;
    private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

    constructor(
        private readonly transport: AcpServerTransport,
        private readonly options: AcpServerOptions
    ) {
        transport.read(chunk => this.receive(chunk));
    }

    private receive(chunk: string | Uint8Array): void {
        this.buffer += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
        let index = this.buffer.indexOf('\n');
        while (index >= 0) {
            const line = this.buffer.slice(0, index).trim();
            this.buffer = this.buffer.slice(index + 1);
            if (line) {
                void this.dispatch(line);
            }
            index = this.buffer.indexOf('\n');
        }
    }

    private async dispatch(line: string): Promise<void> {
        let message: JsonRpcRequest;
        try {
            message = JSON.parse(line);
        } catch {
            return;
        }
        if (message && typeof message.id === 'number' && typeof message.method !== 'string') {
            const pending = this.pending.get(message.id);
            if (pending) {
                this.pending.delete(message.id);
                if ((message as any).error) {
                    pending.reject(new Error(String((message as any).error.message || 'ACP client request failed')));
                } else {
                    pending.resolve((message as any).result);
                }
            }
            return;
        }
        if (!message || typeof message.method !== 'string') {
            return;
        }
        try {
            const result = await this.handle(message.method, message.params ?? {});
            if (message.id != null) {
                await this.send({ jsonrpc: '2.0', id: message.id, result });
            }
        } catch (error) {
            if (message.id != null) {
                await this.send({
                    jsonrpc: '2.0',
                    id: message.id,
                    error: { code: -32000, message: error instanceof Error ? error.message : String(error) }
                });
            }
        }
    }

    async handle(method: string, params: any): Promise<any> {
        switch (method) {
            case 'initialize':
                this.initialized = true;
                return {
                    protocolVersion: 1,
                    agentCapabilities: {
                        promptCapabilities: { image: false, audio: false, embeddedContext: false },
                        mcpCapabilities: { http: false, sse: false }
                    },
                    agentInfo: {
                        name: this.options.serverName ?? 'tsdi-agent',
                        version: this.options.serverVersion ?? '1.0.0'
                    }
                };
            case 'session/new': {
                if (!this.initialized) {
                    throw new Error('ACP initialize must be called before session/new.');
                }
                const sessionId = String(params?.sessionId || `acp-${++this.sessionCounter}`);
                return { sessionId };
            }
            case 'session/prompt': {
                const sessionId = String(params?.sessionId || '');
                if (!sessionId) {
                    throw new Error('session/prompt requires sessionId.');
                }
                const prompt = this.textFromPrompt(params?.prompt);
                const result = await this.options.runtime.runTurn(sessionId, prompt);
                const text = String(result?.message?.content ?? '');
                await this.notify('session/update', {
                    sessionId,
                    update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } }
                });
                return { stopReason: 'end_turn' };
            }
            case 'session/load': {
                const sessionId = String(params?.sessionId || '');
                if (!sessionId) {
                    throw new Error('session/load requires sessionId.');
                }
                const messages = this.options.runtime.getMessages
                    ? await this.options.runtime.getMessages(sessionId)
                    : [];
                return { sessionId, messages };
            }
            case 'session/set_mode': {
                const sessionId = String(params?.sessionId || '');
                const modeId = String(params?.modeId || '');
                if (!sessionId || !modeId) {
                    throw new Error('session/set_mode requires sessionId and modeId.');
                }
                this.options.runtime.setSessionArchetype?.(sessionId, modeId);
                return { sessionId, modeId };
            }
            case 'session/set_model': {
                const sessionId = String(params?.sessionId || '');
                const modelId = String(params?.modelId || '');
                if (!sessionId || !modelId) {
                    throw new Error('session/set_model requires sessionId and modelId.');
                }
                this.options.runtime.setSessionModelProfile?.(sessionId, modelId);
                return { sessionId, modelId };
            }
            case 'session/cancel': {
                const sessionId = String(params?.sessionId || '');
                if (sessionId) {
                    await this.options.runtime.cancelTurn(sessionId);
                }
                return {};
            }
            default:
                throw new Error(`Unsupported ACP method: ${method}`);
        }
    }

    async notify(method: string, params: any): Promise<void> {
        await this.send({ jsonrpc: '2.0', method, params });
    }

    /** Send a JSON-RPC request to the connected client and await its reply. */
    async requestClient(method: string, params: any, timeoutMs = 30000): Promise<any> {
        const id = ++this.nextRequestId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`ACP client request timed out: ${method}`));
            }, timeoutMs);
            this.pending.set(id, {
                resolve: value => { clearTimeout(timer); resolve(value); },
                reject: error => { clearTimeout(timer); reject(error); }
            });
            void this.send({ jsonrpc: '2.0', id, method, params });
        });
    }

    requestPermission(params: any): Promise<any> {
        return this.requestClient('session/request_permission', params);
    }

    createTerminal(params: any): Promise<any> {
        return this.requestClient('terminal/create', params);
    }

    terminalOutput(params: { sessionId: string; terminalId: string }): Promise<any> {
        return this.requestClient('terminal/output', params);
    }

    waitForTerminalExit(params: { sessionId: string; terminalId: string }): Promise<any> {
        return this.requestClient('terminal/wait_for_exit', params);
    }

    killTerminal(params: { sessionId: string; terminalId: string }): Promise<any> {
        return this.requestClient('terminal/kill', params);
    }

    releaseTerminal(params: { sessionId: string; terminalId: string }): Promise<any> {
        return this.requestClient('terminal/release', params);
    }

    readTextFile(params: { sessionId: string; path: string; line?: number; limit?: number }): Promise<any> {
        return this.requestClient('fs/read_text_file', params);
    }

    writeTextFile(params: { sessionId: string; path: string; content: string }): Promise<any> {
        return this.requestClient('fs/write_text_file', params);
    }

    private textFromPrompt(prompt: unknown): string {
        if (typeof prompt === 'string') {
            return prompt;
        }
        if (Array.isArray(prompt)) {
            return prompt
                .map(item => (item && typeof item === 'object' && typeof (item as any).text === 'string' ? (item as any).text : ''))
                .filter(Boolean)
                .join('\n');
        }
        return '';
    }

    private async send(payload: any): Promise<void> {
        await this.transport.write(`${JSON.stringify(payload)}\n`);
    }
}
