import { Inject, Injectable, Optional, Module, ModuleWithProviders } from '@tsdi/ioc';
import { ModelAdapter, ModelRequest, ModelResponse, AgentToolCall } from '@tsdi/agent';
import { AGENT_MODEL_ADAPTER } from '@tsdi/agent';
import { ANTHROPIC_PROVIDER_OPTIONS } from './anthropic-tokens';
import { AnthropicProviderOptions, defaultAnthropicProviderOptions } from './anthropic-options';

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
    content?: string;
    tool_use_id?: string;
}

interface AnthropicToolDef {
    name: string;
    description?: string;
    input_schema: Record<string, any>;
}

interface AnthropicRequest {
    model: string;
    max_tokens: number;
    system?: string;
    messages: AnthropicMessage[];
    tools?: AnthropicToolDef[];
    temperature?: number;
    thinking?: { type: 'enabled'; budget_tokens: number };
}

interface AnthropicResponse {
    id: string;
    type: string;
    role: string;
    content: AnthropicContentBlock[];
    model: string;
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
    };
}

/**
 * Anthropic Messages API provider — native integration for Claude models.
 *
 * Reference:
 *   - zeroclaw:  crates/zeroclaw-providers/src/anthropic.rs  (native Anthropic implementation)
 *   - hermes:    agent/transports/anthropic.py  (AnthropicTransport)
 */
@Injectable()
export class AnthropicProvider extends ModelAdapter {
    constructor(
        @Optional() @Inject(ANTHROPIC_PROVIDER_OPTIONS) private options: AnthropicProviderOptions = {}
    ) {
        super();
    }

    async complete(request: ModelRequest): Promise<ModelResponse> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error('Missing Anthropic API key');
        }

        const body = this.buildRequest(request);
        const response = await fetch(this.url('/v1/messages'), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                ...(this.options.headers ?? {})
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Anthropic request failed: ${response.status} ${await response.text().catch(() => '')}`);
        }

        const data = await response.json() as AnthropicResponse;
        return this.normalize(data);
    }

    private buildRequest(request: ModelRequest): AnthropicRequest {
        const systemParts: string[] = [];
        if (request.summary) {
            systemParts.push(`Session summary:\n${request.summary}`);
        }
        if (request.memory.length) {
            systemParts.push(`Memory:\n${request.memory.map(r => `- [${r.scope}] ${r.key}: ${r.value}`).join('\n')}`);
        }

        const messages: AnthropicMessage[] = [];
        let pendingToolResult: AnthropicMessage | null = null;

        for (const msg of request.messages) {
            if (msg.role === 'system') {
                systemParts.push(typeof msg.content === 'string' ? msg.content : '');
                continue;
            }

            if (pendingToolResult && msg.role !== 'tool') {
                messages.push(pendingToolResult);
                pendingToolResult = null;
            }

            if (msg.role === 'assistant') {
                const blocks: AnthropicContentBlock[] = [];
                const text = typeof msg.content === 'string' ? msg.content : '';
                if (text) blocks.push({ type: 'text', text });

                const toolCalls = msg.metadata?.toolCalls as AgentToolCall[] | undefined;
                if (toolCalls) {
                    for (const tc of toolCalls) {
                        blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input ?? {} });
                    }
                }

                messages.push({ role: 'assistant', content: blocks });
            } else if (msg.role === 'tool') {
                if (!pendingToolResult) {
                    pendingToolResult = { role: 'user', content: [] };
                }
                const content = pendingToolResult.content as AnthropicContentBlock[];
                content.push({
                    type: 'tool_result',
                    tool_use_id: msg.toolCallId ?? `tool-${content.length}`,
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                });
            } else {
                const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                messages.push({ role: 'user', content: text });
            }
        }

        if (pendingToolResult) {
            messages.push(pendingToolResult);
        }

        const tools = request.tools.length ? request.tools.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: (t.inputSchema ?? { type: 'object', properties: {} }) as Record<string, any>
        })) : undefined;

        const body: AnthropicRequest = {
            model: this.resolveModel(),
            max_tokens: this.options.maxTokens ?? defaultAnthropicProviderOptions.maxTokens!,
            messages,
            temperature: this.options.temperature
        };

        if (systemParts.length) {
            body.system = systemParts.join('\n\n');
        }

        if (tools?.length) {
            body.tools = tools;
        }

        if (this.options.thinkingBudget && this.options.thinkingBudget > 0) {
            body.thinking = { type: 'enabled', budget_tokens: this.options.thinkingBudget };
        }

        return body;
    }

    private normalize(data: AnthropicResponse): ModelResponse {
        let message = '';
        const toolCalls: AgentToolCall[] = [];
        let reasoningContent: string | undefined;

        for (const block of data.content) {
            if (block.type === 'text') {
                message += block.text ?? '';
            }
            if (block.type === 'tool_use') {
                toolCalls.push({ id: block.id!, name: block.name!, input: block.input });
            }
        }

        return {
            message: message || undefined,
            toolCalls: toolCalls.length ? toolCalls : undefined,
            stopReason: data.stop_reason === 'tool_use' ? 'tool' : (data.stop_reason === 'end_turn' ? 'end' : 'end'),
            metadata: {
                provider: 'anthropic',
                model: data.model,
                finishReason: data.stop_reason ?? undefined,
                reasoningContent,
                usage: data.usage ?? {}
            }
        };
    }

    private resolveModel(): string {
        return this.options.model ?? defaultAnthropicProviderOptions.model!;
    }

    private resolveBaseUrl(): string {
        return (this.options.baseUrl ?? defaultAnthropicProviderOptions.baseUrl!).replace(/\/+$/, '');
    }

    private resolveApiKey(): string | undefined {
        if (this.options.apiKey) return this.options.apiKey;
        const envKey = this.options.apiKeyEnv ?? defaultAnthropicProviderOptions.apiKeyEnv!;
        return process.env[envKey] || process.env.ANTHROPIC_API_KEY;
    }

    private url(path: string): string {
        return `${this.resolveBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    }
}

@Module({
    providers: [
        { provide: ANTHROPIC_PROVIDER_OPTIONS, useValue: defaultAnthropicProviderOptions },
        { provide: AGENT_MODEL_ADAPTER, useClass: AnthropicProvider },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER }
    ],
    exports: [AnthropicProvider]
})
export class AnthropicProviderModule {
    static withOptions(options?: AnthropicProviderOptions): ModuleWithProviders<AnthropicProviderModule> {
        return {
            module: AnthropicProviderModule,
            providers: [
                { provide: ANTHROPIC_PROVIDER_OPTIONS, useValue: { ...defaultAnthropicProviderOptions, ...(options ?? {}) } }
            ]
        };
    }
}

export function withAnthropicProvider(options?: AnthropicProviderOptions): any[] {
    return [
        { provide: ANTHROPIC_PROVIDER_OPTIONS, useValue: { ...defaultAnthropicProviderOptions, ...(options ?? {}) } },
        { provide: AGENT_MODEL_ADAPTER, useClass: AnthropicProvider },
        { provide: ModelAdapter, useExisting: AGENT_MODEL_ADAPTER }
    ];
}
