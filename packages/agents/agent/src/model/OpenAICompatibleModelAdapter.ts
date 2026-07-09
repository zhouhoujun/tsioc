import { AgentMemoryRecord } from '../memory/MemoryStore';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ModelAdapter } from './ModelAdapter';
import { ModelRequest } from './ModelRequest';
import { AgentToolCall, ModelResponse } from './ModelResponse';
import { StreamChunk } from './StreamChunk';
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
    stream?: boolean;
    stream_options?: { include_usage?: boolean };
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

interface SSEDelta {
    content?: string | Array<{ type?: string; text?: string; content?: string; reasoning_content?: string }> | { text?: string; content?: string } | null;
    text?: string | null;
    reasoning?: string | null;
    reasoning_content?: string;
    tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
            name?: string;
            arguments?: string;
        };
    }>;
}

interface SSEChoice {
    delta: SSEDelta;
    finish_reason?: string | null;
}

interface SSEEvent {
    choices?: SSEChoice[];
    usage?: OpenAIChatCompletionResponse['usage'];
}

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000;

export class OpenAICompatibleModelAdapter extends ModelAdapter {
    protected appArgs?: ApplicationArguments;

    constructor(protected readonly options: AgentModelOptions, appArgs?: ApplicationArguments) {
        super();
        this.appArgs = appArgs;
    }

    async complete(request: ModelRequest, attempt = 1): Promise<ModelResponse> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(`Missing API key for ${this.options.provider ?? 'model provider'}.`);
        }
        const toolNames = this.createToolNameMaps(request.tools);
        const requestBody = this.createRequest(request, toolNames.forward);

        const { signal, cleanup } = this.createTimeoutContext();
        try {
            const requestUrl = this.resolveUrl('/chat/completions');
            let response: Response;
            try {
                response = await fetch(requestUrl, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${apiKey}`,
                        ...(this.options.headers ?? {})
                    },
                    body: JSON.stringify(requestBody),
                    signal
                });
            } catch (error: any) {
                throw new Error(`Model request failed: ${error?.message || String(error)} (${requestUrl})`);
            }

            if (!response.ok) {
                if (this.isRetryable(response.status) && attempt <= MAX_RETRIES) {
                    cleanup();
                    return this.retry(request, attempt, response.status);
                }
                throw new Error(`Model request failed with ${response.status}`);
            }

            const body = await response.json() as OpenAIChatCompletionResponse;
            const choice = body.choices?.[0];
            const message = choice?.message;
            const toolCalls = this.parseToolCalls(message?.tool_calls, toolNames.reverse);
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

    async *stream(request: ModelRequest): AsyncGenerator<StreamChunk> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(`Missing API key for ${this.options.provider ?? 'model provider'}.`);
        }
        const toolNames = this.createToolNameMaps(request.tools);

        const { signal, cleanup } = this.createTimeoutContext();
        const url = this.resolveUrl('/chat/completions');
        const reqBody = this.createStreamRequest(request, toolNames.forward);

        try {
            let response: Response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${apiKey}`,
                        accept: 'text/event-stream',
                        ...(this.options.headers ?? {})
                    },
                    body: JSON.stringify(reqBody),
                    signal
                });
            } catch (error: any) {
                throw new Error(`Model streaming request failed: ${error?.message || String(error)} (${url})`);
            }

            if (!response.ok) {
                throw new Error(`Model streaming request failed with ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Model streaming response has no readable body.');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedText = '';
            let accumulatedReasoning = '';
            const accumulatedToolCalls = new Map<number, {
                id?: string;
                name?: string;
                args: string;
            }>();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) {
                        continue;
                    }
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') {
                        break;
                    }

                    let event: SSEEvent;
                    try {
                        event = JSON.parse(payload);
                    } catch {
                        continue;
                    }

                    const choice = event.choices?.[0];
                    if (!choice) {
                        if (event.usage) {
                            yield { type: 'done', usage: event.usage as any };
                        }
                        continue;
                    }

                    // Text content delta
                    const delta = this.extractStreamText(choice.delta);
                    if (delta) {
                        accumulatedText += delta;
                        yield { type: 'text', content: delta };
                    }

                    // Reasoning content delta
                    const reasoningDelta = this.extractStreamReasoning(choice.delta);
                    if (reasoningDelta) {
                        accumulatedReasoning += reasoningDelta;
                        yield { type: 'reasoning', content: reasoningDelta };
                    }

                    // Tool call deltas (streamed as chunks with index)
                    const toolCallDeltas = choice.delta?.tool_calls;
                    if (toolCallDeltas) {
                        for (const tc of toolCallDeltas) {
                        const existing = accumulatedToolCalls.get(tc.index) ?? { args: '' };
                            if (tc.id) { existing.id = tc.id; }
                            if (tc.function?.name) { existing.name = toolNames.reverse.get(tc.function.name) || tc.function.name; }
                            if (tc.function?.arguments) { existing.args += tc.function.arguments; }
                            accumulatedToolCalls.set(tc.index, existing);
                        }
                    }

                    // Finish reason signals end of this choice
                    if (choice.finish_reason) {
                        const toolCalls: AgentToolCall[] = [];
                        for (const [, val] of accumulatedToolCalls) {
                            if (val.name) {
                                toolCalls.push({
                                    id: val.id ?? `tc-${Date.now()}-${toolCalls.length}`,
                                    name: val.name,
                                    input: this.parseToolInput(val.args)
                                });
                            }
                        }
                        yield {
                            type: 'done',
                            toolCalls: toolCalls.length ? toolCalls : undefined,
                            usage: event.usage as any,
                            metadata: {
                                finishReason: choice.finish_reason,
                                provider: this.options.provider,
                                model: this.resolveModel()
                            }
                        };
                    }
                }
            }
        } finally {
            cleanup();
        }
    }

    protected resolveModel(): string {
        return this.options.model ?? 'deepseek-v4-flash';
    }

    protected resolveBaseUrl(): string {
        return (this.options.baseUrl ?? 'https://api.deepseek.com').replace(/\/+$/, '');
    }

    protected resolveApiBaseUrl(): string {
        const baseUrl = this.resolveBaseUrl();
        const provider = String(this.options.provider || '').trim().toLowerCase();
        if (provider !== 'openai' && provider !== 'openai-compatible') {
            return baseUrl;
        }
        if (/\/v\d+(?:\/|$)/.test(baseUrl)) {
            return baseUrl;
        }
        return `${baseUrl}/v1`;
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
        return `${this.resolveApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    }

    private isRetryable(status: number): boolean {
        return status === 429 || status === 500 || status === 502 || status === 503;
    }

    private async retry(request: ModelRequest, attempt: number, _lastStatus: number): Promise<ModelResponse> {
        const delay = Math.min(BASE_RETRY_MS * Math.pow(2, attempt - 1) + Math.random() * 500, 15000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.complete(request, attempt + 1);
    }

    protected createRequest(
        request: ModelRequest,
        toolNameMap: Map<string, string> = new Map()
    ): OpenAIChatCompletionRequest {
        return {
            model: this.resolveModel(),
            messages: this.mapRequestMessages(request, toolNameMap),
            tools: request.tools.length ? request.tools.map(tool => this.mapTool(tool, toolNameMap)) : undefined,
            tool_choice: request.tools.length ? 'auto' : undefined,
            temperature: this.options.temperature,
            max_tokens: this.options.maxTokens
        };
    }

    protected createStreamRequest(
        request: ModelRequest,
        toolNameMap: Map<string, string> = new Map()
    ): OpenAIChatCompletionRequest {
        return {
            ...this.createRequest(request, toolNameMap),
            stream: true,
            stream_options: { include_usage: true }
        };
    }

    protected mapRequestMessages(
        request: ModelRequest,
        toolNameMap: Map<string, string> = new Map()
    ): OpenAIMessage[] {
        const contextMessages = this.mapContextMessages(request.summary, request.memory);
        return contextMessages.concat(this.mapMessages(request.messages, toolNameMap));
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

    protected mapMessages(
        messages: AgentMessage[],
        toolNameMap: Map<string, string> = new Map()
    ): OpenAIMessage[] {
        const result: OpenAIMessage[] = [];
        let activeToolCallIds: Set<string> | undefined;

        for (const message of messages) {
            if (message.role === 'assistant' && this.hasToolCalls(message)) {
                const toolCalls = this.getToolCalls(message).filter(call => call.input !== undefined);
                if (toolCalls.length) {
                    result.push({
                        role: 'assistant',
                        content: this.extractText(message.content),
                        tool_calls: toolCalls.map(call => this.mapToolCall(call, toolNameMap))
                    });
                    activeToolCallIds = new Set(toolCalls.map(call => call.id));
                } else {
                    activeToolCallIds = undefined;
                }
                continue;
            }

            if (message.role === 'tool') {
                const toolCallId = message.toolCallId ?? message.name ?? `tool-${result.length}`;
                if (!activeToolCallIds || !activeToolCallIds.has(toolCallId)) {
                    result.push({
                        role: 'assistant',
                        content: null,
                        tool_calls: [this.mapSyntheticToolCall(message, toolCallId, toolNameMap)]
                    });
                    activeToolCallIds = new Set([toolCallId]);
                }

                result.push({
                    role: 'tool',
                    content: message.content,
                    tool_call_id: toolCallId,
                    name: message.name ? (toolNameMap.get(message.name) || message.name) : undefined
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

    protected mapTool(tool: AgentToolDefinition, toolNameMap: Map<string, string> = new Map()): OpenAIToolDefinition {
        return {
            type: 'function',
            function: {
                name: toolNameMap.get(tool.name) || tool.name,
                description: tool.description,
                parameters: tool.inputSchema ?? { type: 'object', properties: {} }
            }
        };
    }

    protected mapToolCall(
        toolCall: AgentToolCall,
        toolNameMap: Map<string, string> = new Map()
    ): NonNullable<OpenAIMessage['tool_calls']>[number] {
        return {
            id: toolCall.id,
            type: 'function',
            function: {
                name: toolNameMap.get(toolCall.name) || toolCall.name,
                arguments: JSON.stringify(toolCall.input ?? {})
            }
        };
    }

    protected mapSyntheticToolCall(
        message: AgentMessage,
        toolCallId: string,
        toolNameMap: Map<string, string> = new Map()
    ): NonNullable<OpenAIMessage['tool_calls']>[number] {
        return {
            id: toolCallId,
            type: 'function',
            function: {
                name: message.name ? (toolNameMap.get(message.name) || message.name) : 'tool',
                arguments: JSON.stringify(message.metadata?.toolCallInput ?? message.metadata?.input ?? {})
            }
        };
    }

    protected getToolCalls(message: AgentMessage): AgentToolCall[] {
        return (message.metadata?.toolCalls as AgentToolCall[] | undefined) ?? [];
    }

    protected hasToolCalls(message: AgentMessage): boolean {
        return Array.isArray(message.metadata?.toolCalls) && message.metadata.toolCalls.length > 0;
    }

    protected parseToolCalls(
        toolCalls?: NonNullable<NonNullable<NonNullable<OpenAIChatCompletionResponse['choices']>[number]['message']>['tool_calls']>,
        reverseToolNameMap: Map<string, string> = new Map()
    ): AgentToolCall[] {
        return (toolCalls ?? []).map(toolCall => ({
            id: toolCall.id ?? `tool-${Date.now()}`,
            name: reverseToolNameMap.get(toolCall.function?.name ?? '') || toolCall.function?.name || 'tool',
            input: this.parseToolInput(toolCall.function?.arguments)
        }));
    }

    protected createToolNameMaps(tools: AgentToolDefinition[]): { forward: Map<string, string>; reverse: Map<string, string> } {
        const forward = new Map<string, string>();
        const reverse = new Map<string, string>();
        const used = new Set<string>();
        for (const tool of tools) {
            const original = String(tool.name || 'tool');
            let normalized = original.replace(/[^a-zA-Z0-9_-]/g, '_');
            if (!normalized) {
                normalized = 'tool';
            }
            let unique = normalized;
            let suffix = 2;
            while (used.has(unique) && reverse.get(unique) !== original) {
                unique = `${normalized}_${suffix}`;
                suffix += 1;
            }
            used.add(unique);
            forward.set(original, unique);
            reverse.set(unique, original);
        }
        return { forward, reverse };
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

    protected extractStreamText(delta?: SSEDelta | null): string {
        if (!delta) {
            return '';
        }
        if (typeof delta.text === 'string') {
            return delta.text;
        }
        if (typeof delta.content === 'string') {
            return delta.content;
        }
        if (Array.isArray(delta.content)) {
            return delta.content
                .map(part => part.text ?? part.content ?? '')
                .join('');
        }
        if (delta.content && typeof delta.content === 'object') {
            return String(delta.content.text ?? delta.content.content ?? '');
        }
        return '';
    }

    protected extractStreamReasoning(delta?: SSEDelta | null): string {
        if (!delta) {
            return '';
        }
        if (typeof delta.reasoning_content === 'string') {
            return delta.reasoning_content;
        }
        if (typeof delta.reasoning === 'string') {
            return delta.reasoning;
        }
        if (Array.isArray(delta.content)) {
            return delta.content
                .map(part => part.reasoning_content ?? '')
                .join('');
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
