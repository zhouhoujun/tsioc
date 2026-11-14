import type { AgentRuntime } from '../runtime/AgentRuntime';

export interface AcpServerTransport {
    read(listener: (chunk: string | Uint8Array) => void): void;
    write(payload: string): void | Promise<void>;
}

export interface AcpServerOptions {
    runtime: Pick<AgentRuntime, 'runTurn' | 'cancelTurn'>;
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
