import { AgentMessage } from '../runtime/AgentMessage';
import { ModelAdapter } from './ModelAdapter';
import { ModelRequest } from './ModelRequest';
import { AgentToolCall, ModelResponse } from './ModelResponse';
import { StreamChunk } from './StreamChunk';
import { AgentModelOptions } from './ModelProviderOptions';

interface AnthropicContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
    is_error?: boolean;
    cache_control?: { type: 'ephemeral' };
}

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

interface AnthropicToolDef {
    name: string;
    description?: string;
    input_schema: Record<string, unknown>;
}

interface AnthropicRequestBody {
    model: string;
    max_tokens: number;
    system?: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
    messages: AnthropicMessage[];
    tools?: AnthropicToolDef[];
    temperature?: number;
    thinking?: { type: 'enabled'; budget_tokens: number };
    stream?: boolean;
}

interface AnthropicUsage {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
}

interface AnthropicResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: AnthropicContentBlock[];
    model: string;
    stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
    stop_sequence: string | null;
    usage: AnthropicUsage;
}

// ---- SSE event types ----

interface AnthropicSSEMessageStart {
    type: 'message_start';
    message: { id: string; model: string; usage: AnthropicUsage };
}

interface AnthropicSSEContentBlockStart {
    type: 'content_block_start';
    index: number;
    content_block: AnthropicContentBlock;
}

interface AnthropicSSEContentBlockDelta {
    type: 'content_block_delta';
    index: number;
    delta: {
        type: 'text_delta' | 'input_json_delta' | 'thinking_delta' | 'signature_delta';
        text?: string;
        partial_json?: string;
        thinking?: string;
        signature?: string;
    };
}

interface AnthropicSSEContentBlockStop {
    type: 'content_block_stop';
    index: number;
}

interface AnthropicSSEMessageDelta {
    type: 'message_delta';
    delta: { stop_reason: string | null; stop_sequence: string | null };
    usage: { output_tokens: number };
}

interface AnthropicSSEMessageStop {
    type: 'message_stop';
}

type AnthropicSSEEvent =
    | AnthropicSSEMessageStart
    | AnthropicSSEContentBlockStart
    | AnthropicSSEContentBlockDelta
    | AnthropicSSEContentBlockStop
    | AnthropicSSEMessageDelta
    | AnthropicSSEMessageStop
    | { type: 'ping' };

const ANTHROPIC_VERSION = '2023-06-01';
const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000;

export class AnthropicModelAdapter extends ModelAdapter {
    constructor(protected readonly options: AgentModelOptions) {
        super();
    }

    // ── complete (non-streaming) ──────────────────────────────────────

    async complete(request: ModelRequest, attempt = 1): Promise<ModelResponse> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(`Missing Anthropic API key. Set ${this.options.apiKeyEnv ?? 'ANTHROPIC_API_KEY'}.`);
        }

        const { signal, cleanup } = this.createTimeoutContext();
        try {
            const response = await fetch(this.resolveUrl('/v1/messages'), {
                method: 'POST',
                headers: this.headers(apiKey),
                body: JSON.stringify(this.buildBody(request)),
                signal
            });

            if (!response.ok) {
                cleanup();
                if (this.isRetryable(response.status) && attempt <= MAX_RETRIES) {
                    return this.retry(request, attempt, response.status);
                }
                const errorBody = await response.text().catch(() => '');
                throw new Error(`Anthropic request failed: ${response.status} ${errorBody}`);
            }

            const data = await response.json() as AnthropicResponse;
            return this.toModelResponse(data);
        } finally {
            cleanup();
        }
    }

    // ── stream ─────────────────────────────────────────────────────────

    async *stream(request: ModelRequest): AsyncGenerator<StreamChunk> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(`Missing Anthropic API key. Set ${this.options.apiKeyEnv ?? 'ANTHROPIC_API_KEY'}.`);
        }

        const { signal, cleanup } = this.createTimeoutContext();
        try {
            const response = await fetch(this.resolveUrl('/v1/messages'), {
                method: 'POST',
                headers: this.headers(apiKey),
                body: JSON.stringify({ ...this.buildBody(request), stream: true }),
                signal
            });

            if (!response.ok) {
                throw new Error(`Anthropic streaming request failed: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Anthropic stream has no readable body.');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            // Per-block-index accumulators
            const blockText = new Map<number, string>();
            const blockToolInput = new Map<number, string>();
            const blockToolName = new Map<number, string>();
            const blockToolId = new Map<number, string>();
            let thinkingText = '';
            let currentStopReason: string | null = null;
            let usage: AnthropicUsage | undefined;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (!payload) continue;

                    const event = JSON.parse(payload) as AnthropicSSEEvent;

                    switch (event.type) {
                        case 'message_start': {
                            usage = event.message.usage;
                            break;
                        }

                        case 'content_block_start': {
                            const block = event.content_block;
                            const idx = event.index;
                            if (block.type === 'text') {
                                blockText.set(idx, '');
                            } else if (block.type === 'tool_use') {
                                blockToolName.set(idx, block.name ?? '');
                                blockToolId.set(idx, block.id ?? '');
                                blockToolInput.set(idx, '');
                            }
                            break;
                        }

                        case 'content_block_delta': {
                            const idx = event.index;
                            const delta = event.delta;
                            if (delta.type === 'text_delta' && delta.text) {
                                const prior = blockText.get(idx) ?? '';
                                blockText.set(idx, prior + delta.text);
                                yield { type: 'text', content: delta.text };
                            } else if (delta.type === 'input_json_delta' && delta.partial_json) {
                                const prior = blockToolInput.get(idx) ?? '';
                                blockToolInput.set(idx, prior + delta.partial_json);
                            } else if (delta.type === 'thinking_delta' && delta.thinking) {
                                thinkingText += delta.thinking;
                                yield { type: 'reasoning', content: delta.thinking };
                            }
                            break;
                        }

                        case 'content_block_stop': {
                            // block finalized — nothing to flush mid-stream
                            break;
                        }

                        case 'message_delta': {
                            currentStopReason = event.delta.stop_reason;
                            if (event.usage) {
                                usage = { ...(usage ?? {} as any), output_tokens: event.usage.output_tokens };
                            }
                            break;
                        }

                        case 'message_stop': {
                            // Build immutable tool calls from accumulated state
                            const toolCalls: AgentToolCall[] = [];
                            for (const idx of blockToolName.keys()) {
                                const name = blockToolName.get(idx)!;
                                const id = blockToolId.get(idx) ?? `tc-${idx}`;
                                const raw = blockToolInput.get(idx) ?? '{}';
                                let input: any = {};
                                try { input = JSON.parse(raw); } catch { /* partial */ }
                                toolCalls.push({ id, name, input });
                            }

                            yield {
                                type: 'done',
                                toolCalls: toolCalls.length ? toolCalls : undefined,
                                usage: usage ? {
                                    promptTokens: usage.input_tokens,
                                    completionTokens: usage.output_tokens,
                                    totalTokens: usage.input_tokens + usage.output_tokens
                                } : undefined,
                                metadata: {
                                    provider: 'anthropic',
                                    model: this.resolveModel(),
                                    finishReason: currentStopReason ?? undefined,
                                    reasoningContent: thinkingText || undefined,
                                    usage
                                }
                            };
                            break;
                        }

                        case 'ping': {
                            break;
                        }
                    }
                }
            }
        } finally {
            cleanup();
        }
    }

    // ── request building ───────────────────────────────────────────────

    private buildBody(request: ModelRequest): AnthropicRequestBody {
        const systemParts: string[] = [];
        if (request.summary) {
            systemParts.push(`Session summary:\n${request.summary}`);
        }
        if (request.memory.length) {
            systemParts.push(`Memory:\n${request.memory.map(r => `- [${r.scope}] ${r.key}: ${r.value}`).join('\n')}`);
        }

        // Extract system messages from the prompt builder
        for (const msg of request.messages) {
            if (msg.role === 'system') {
                systemParts.push(typeof msg.content === 'string' ? msg.content : '');
            }
        }

        const messages = this.mapMessages(request.messages);

        const body: AnthropicRequestBody = {
            model: this.resolveModel(),
            max_tokens: this.options.maxTokens ?? 8192,
            messages
        };

        if (systemParts.length) {
            body.system = systemParts.join('\n\n');
        }

        if (request.tools.length) {
            body.tools = request.tools.map(t => ({
                name: t.name,
                description: t.description,
                input_schema: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>
            }));
        }

        if (this.options.temperature != null) {
            body.temperature = this.options.temperature;
        }

        if ((this.options as any).thinkingBudget && (this.options as any).thinkingBudget > 0) {
            body.thinking = { type: 'enabled', budget_tokens: (this.options as any).thinkingBudget };
        }

        return body;
    }

    // ── message mapping ────────────────────────────────────────────────

    private mapMessages(messages: AgentMessage[]): AnthropicMessage[] {
        const result: AnthropicMessage[] = [];
        let pendingToolResults: AnthropicContentBlock[] = [];

        const flushToolResults = () => {
            if (pendingToolResults.length) {
                result.push({ role: 'user', content: pendingToolResults });
                pendingToolResults = [];
            }
        };

        for (const msg of messages) {
            if (msg.role === 'system') continue; // handled in buildBody

            if (msg.role === 'assistant') {
                flushToolResults();
                const blocks: AnthropicContentBlock[] = [];
                const text = typeof msg.content === 'string' ? msg.content : '';
                if (text) {
                    blocks.push({ type: 'text', text });
                }
                const toolCalls = (msg.metadata?.toolCalls as AgentToolCall[] | undefined) ?? [];
                for (const tc of toolCalls) {
                    blocks.push({
                        type: 'tool_use',
                        id: tc.id,
                        name: tc.name,
                        input: (tc.input ?? {}) as Record<string, unknown>
                    });
                }
                if (blocks.length) {
                    result.push({ role: 'assistant', content: blocks });
                }
            } else if (msg.role === 'tool') {
                pendingToolResults.push({
                    type: 'tool_result',
                    tool_use_id: msg.toolCallId ?? msg.name ?? `tool-${pendingToolResults.length}`,
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                });
            } else {
                // user
                flushToolResults();
                const text = typeof msg.content === 'string' ? msg.content : '';
                result.push({ role: 'user', content: text });
            }
        }

        flushToolResults();
        return result;
    }

    // ── response normalization ─────────────────────────────────────────

    private toModelResponse(data: AnthropicResponse): ModelResponse {
        let message = '';
        const toolCalls: AgentToolCall[] = [];

        for (const block of data.content) {
            if (block.type === 'text') {
                message += block.text ?? '';
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id!,
                    name: block.name!,
                    input: block.input
                });
            }
        }

        return {
            message: message || undefined,
            toolCalls: toolCalls.length ? toolCalls : undefined,
            stopReason: data.stop_reason === 'tool_use' ? 'tool'
                : (data.stop_reason === 'end_turn' ? 'end' : 'end'),
            metadata: {
                provider: 'anthropic',
                model: data.model,
                finishReason: data.stop_reason ?? undefined,
                usage: data.usage
            }
        };
    }

    // ── helpers ────────────────────────────────────────────────────────

    private headers(apiKey: string): Record<string, string> {
        return {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            ...(this.options.headers ?? {})
        };
    }

    protected resolveModel(): string {
        return this.options.model ?? 'claude-sonnet-4-20250514';
    }

    protected resolveBaseUrl(): string {
        return (this.options.baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '');
    }

    protected resolveApiKey(): string | undefined {
        if (this.options.apiKey) return this.options.apiKey;
        const envKey = this.options.apiKeyEnv ?? 'ANTHROPIC_API_KEY';
        return process.env[envKey] || process.env['ANTHROPIC_API_KEY'];
    }

    protected resolveUrl(path: string): string {
        return `${this.resolveBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    }

    private isRetryable(status: number): boolean {
        return status === 429 || status === 500 || status === 502 || status === 503 || status === 529;
    }

    private async retry(request: ModelRequest, attempt: number, _status: number): Promise<ModelResponse> {
        const delay = Math.min(BASE_RETRY_MS * Math.pow(2, attempt - 1) + Math.random() * 500, 15000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.complete(request, attempt + 1);
    }

    protected createTimeoutContext(): { signal?: AbortSignal; cleanup(): void } {
        const timeout = this.options.timeoutMs;
        if (!timeout || timeout <= 0) {
            return { cleanup() { return; } };
        }
        const controller = new AbortController();
        const handle = setTimeout(() => controller.abort(), timeout);
        return {
            signal: controller.signal,
            cleanup() { clearTimeout(handle); }
        };
    }
}
