import { AgentMemoryRecord } from '../memory/MemoryStore';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ModelAdapter } from './ModelAdapter';
import { ModelRequest } from './ModelRequest';
import { AgentToolCall, ModelResponse } from './ModelResponse';
import { AgentModelOptions } from './ModelProviderOptions';
import type { ApplicationArguments } from '@tsdi/core';

type OpenAIRole = 'system' | 'user' | 'assistant' | 'tool';

interface OpenAIMessage {
    role: OpenAIRole;
    content?: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

interface OpenAIToolDefinition {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: Record<string, any>;
    };
}

interface OpenAIChatCompletionRequest {
    model: string;
    messages: OpenAIMessage[];
    tools?: OpenAIToolDefinition[];
    tool_choice?: 'auto';
    temperature?: number;
    max_tokens?: number;
}

interface OpenAIChatCompletionResponse {
    choices?: Array<{
        message?: {
            role?: 'assistant';
            content?: string | Array<{ type?: string; text?: string }> | null;
            tool_calls?: Array<{
                id?: string;
                type?: string;
                function?: {
                    name?: string;
                    arguments?: string;
                };
            }>;
            reasoning_content?: string;
        };
        finish_reason?: string;
    }>;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        prompt_tokens_details?: {
            cached_tokens?: number;
        };
    };
}

export class OpenAICompatibleModelAdapter extends ModelAdapter {
    protected appArgs?: ApplicationArguments;

    constructor(protected readonly options: AgentModelOptions, appArgs?: ApplicationArguments) {
        super();
        this.appArgs = appArgs;
    }

    async complete(request: ModelRequest): Promise<ModelResponse> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(`Missing API key for ${this.options.provider ?? 'model provider'}.`);
        }

        const { signal, cleanup } = this.createTimeoutContext();
        try {
            const response = await fetch(this.resolveUrl('/chat/completions'), {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${apiKey}`,
                    ...(this.options.headers ?? {})
                },
                body: JSON.stringify(this.createRequest(request)),
                signal
            });

            if (!response.ok) {
                throw new Error(`Model request failed with ${response.status}`);
            }

            const body = await response.json() as OpenAIChatCompletionResponse;
        const choice = body.choices?.[0];
        const message = choice?.message;
        const toolCalls = this.parseToolCalls(message?.tool_calls);
        const text = this.extractText(message?.content);
        const reasoningContent = message?.reasoning_content;
        const finishReason = choice?.finish_reason;

            return {
                message: text,
                toolCalls: toolCalls.length ? toolCalls : undefined,
                stopReason: finishReason === 'tool_calls' ? 'tool' : 'end',
                metadata: {
                    provider: this.options.provider,
                    model: this.resolveModel(),
                    finishReason,
                    reasoningContent,
                    usage: body.usage
                }
            };
        } finally {
            cleanup();
        }
    }

    protected resolveModel(): string {
        return this.options.model ?? 'deepseek-chat';
    }

    protected resolveBaseUrl(): string {
        return (this.options.baseUrl ?? 'https://api.deepseek.com').replace(/\/+$/, '');
    }

    protected resolveApiKey(): string | undefined {
        if (this.options.apiKey) {
            return this.options.apiKey;
        }
        const envKey = this.options.apiKeyEnv ?? 'DEEPSEEK_API_KEY';
        return this.appArgs?.get<string>(envKey)
            || this.appArgs?.get<string>('API_KEY');
    }

    protected resolveUrl(path: string): string {
        return `${this.resolveBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    }

    protected createRequest(request: ModelRequest): OpenAIChatCompletionRequest {
        return {
            model: this.resolveModel(),
            messages: this.mapRequestMessages(request),
            tools: request.tools.length ? request.tools.map(tool => this.mapTool(tool)) : undefined,
            tool_choice: request.tools.length ? 'auto' : undefined,
            temperature: this.options.temperature,
            max_tokens: this.options.maxTokens
        };
    }

    protected mapRequestMessages(request: ModelRequest): OpenAIMessage[] {
        const contextMessages = this.mapContextMessages(request.summary, request.memory);
        return contextMessages.concat(this.mapMessages(request.messages));
    }

    protected mapContextMessages(summary?: string, memory: AgentMemoryRecord[] = []): OpenAIMessage[] {
        const messages: OpenAIMessage[] = [];
        if (summary) {
            messages.push({
                role: 'system',
                content: `Session summary:\n${summary}`
            });
        }
        if (memory.length) {
            messages.push({
                role: 'system',
                content: `Memory:\n${memory.map(record => `- [${record.scope}] ${record.key}: ${record.value}`).join('\n')}`
            });
        }
        return messages;
    }

    protected mapMessages(messages: AgentMessage[]): OpenAIMessage[] {
        const result: OpenAIMessage[] = [];
        let activeToolCallIds: Set<string> | undefined;

        for (const message of messages) {
            if (message.role === 'assistant' && this.hasToolCalls(message)) {
                const toolCalls = this.getToolCalls(message);
                result.push({
                    role: 'assistant',
                    content: this.extractText(message.content),
                    tool_calls: toolCalls.map(call => this.mapToolCall(call))
                });
                activeToolCallIds = new Set(toolCalls.map(call => call.id));
                continue;
            }

            if (message.role === 'tool') {
                const toolCallId = message.toolCallId ?? message.name ?? `tool-${result.length}`;
                if (!activeToolCallIds || !activeToolCallIds.has(toolCallId)) {
                    result.push({
                        role: 'assistant',
                        content: null,
                        tool_calls: [this.mapSyntheticToolCall(message, toolCallId)]
                    });
                    activeToolCallIds = new Set([toolCallId]);
                }

                result.push({
                    role: 'tool',
                    content: message.content,
                    tool_call_id: toolCallId,
                    name: message.name
                });
                continue;
            }

            activeToolCallIds = undefined;
            result.push({
                role: message.role,
                content: this.extractText(message.content) || null
            });
        }

        return result;
    }

    protected mapTool(tool: AgentToolDefinition): OpenAIToolDefinition {
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema ?? { type: 'object', properties: {} }
            }
        };
    }

    protected mapToolCall(toolCall: AgentToolCall): NonNullable<OpenAIMessage['tool_calls']>[number] {
        return {
            id: toolCall.id,
            type: 'function',
            function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.input ?? {})
            }
        };
    }

    protected mapSyntheticToolCall(message: AgentMessage, toolCallId: string): NonNullable<OpenAIMessage['tool_calls']>[number] {
        return {
            id: toolCallId,
            type: 'function',
            function: {
                name: message.name ?? 'tool',
                arguments: JSON.stringify(message.metadata?.input ?? message.metadata?.toolCallInput ?? {})
            }
        };
    }

    protected getToolCalls(message: AgentMessage): AgentToolCall[] {
        return (message.metadata?.toolCalls as AgentToolCall[] | undefined) ?? [];
    }

    protected hasToolCalls(message: AgentMessage): boolean {
        return Array.isArray(message.metadata?.toolCalls) && message.metadata.toolCalls.length > 0;
    }

    protected parseToolCalls(toolCalls?: NonNullable<NonNullable<NonNullable<OpenAIChatCompletionResponse['choices']>[number]['message']>['tool_calls']>): AgentToolCall[] {
        return (toolCalls ?? []).map(toolCall => ({
            id: toolCall.id ?? `tool-${Date.now()}`,
            name: toolCall.function?.name ?? 'tool',
            input: this.parseToolInput(toolCall.function?.arguments)
        }));
    }

    protected parseToolInput(input?: string): any {
        if (!input) {
            return {};
        }
        try {
            return JSON.parse(input);
        } catch {
            return {};
        }
    }

    protected extractText(content?: string | Array<{ type?: string; text?: string }> | null): string {
        if (typeof content === 'string') {
            return content;
        }
        if (Array.isArray(content)) {
            return content.map(part => part.text ?? '').join('');
        }
        return '';
    }

    protected createTimeoutContext(): { signal?: AbortSignal, cleanup(): void } {
        const timeout = this.options.timeoutMs;
        if (!timeout || timeout <= 0) {
            return {
                cleanup() {
                    return;
                }
            };
        }

        const controller = new AbortController();
        const handle = setTimeout(() => controller.abort(), timeout);
        return {
            signal: controller.signal,
            cleanup() {
                clearTimeout(handle);
            }
        };
    }
}
