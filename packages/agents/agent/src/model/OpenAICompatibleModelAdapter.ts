import { AgentMemoryRecord } from '../memory/MemoryStore';
import { AgentImageMessagePart, AgentMessage, AgentMessagePart, getAgentMessageText, resolveAgentMessageParts } from '../runtime/AgentMessage';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ModelAdapter } from './ModelAdapter';
import { retryDelayMs } from './RetryPolicy';
import { ModelRequest } from './ModelRequest';
import { AgentToolCall, ModelResponse, ModelTokenUsage } from './ModelResponse';
import { StreamChunk } from './StreamChunk';
import { AgentModelOptions, PromptCacheRuntimeMetadata, ResolvedAgentPromptCachePolicy, buildPromptCacheRuntimeMetadata, resolvePromptCachePolicy } from './ModelProviderOptions';
import type { ApplicationArguments } from '@tsdi/core';

type OpenAIRole = 'system' | 'user' | 'assistant' | 'tool';

interface OpenAIContentPart {
    type: 'text' | 'image_url';
    text?: string;
    cache_control?: { type: 'ephemeral' | 'persistent' };
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
}

interface OpenAIMessage {
    role: OpenAIRole;
    content?: string | OpenAIContentPart[] | null;
    name?: string;
    tool_call_id?: string;
    reasoning_content?: string;
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
    /** P42: OpenAI reasoning effort. Reasoning models reject `temperature`. */
    reasoning_effort?: 'low' | 'medium' | 'high';
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
    message?: {
        tool_calls?: Array<{
            id?: string;
            type?: string;
            function?: {
                name?: string;
                arguments?: string;
            };
        }>;
        function_call?: {
            name?: string;
            arguments?: string;
        };
    };
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

    readonly provider: string;

    private lastStaticPrefixHash?: string;
    private staticPrefixBroken = false;

    constructor(protected readonly options: AgentModelOptions, appArgs?: ApplicationArguments) {
        super();
        this.provider = String(this.options.provider || '').trim().toLowerCase() || 'openai-compatible';
        this.appArgs = appArgs;
    }

    async complete(request: ModelRequest, attempt = 1): Promise<ModelResponse> {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(`Missing API key for ${this.options.provider ?? 'model provider'}.`);
        }
        const toolNames = this.createToolNameMaps(request.tools);
        const requestBody = this.createRequest(request, toolNames.forward);

        const { signal, cleanup } = this.createTimeoutContext(request.signal);
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
                    return this.retry(request, attempt, response.status, response.headers.get('retry-after'));
                }
                const detail = await this.readResponseError(response);
                throw new Error(`Model request failed with ${response.status}${detail ? `: ${detail}` : ''}`);
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
                    usage: this.normalizeUsage(body.usage),
                    providerUsage: body.usage,
                    promptCache: this.buildPromptCacheMetadata(body.usage, requestBody)
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

        const { signal, cleanup, markActivity, getAbortReason } = this.createStreamingTimeoutContext(request.signal);
        const url = this.resolveUrl('/chat/completions');
        const reqBody = this.createStreamRequest(request, toolNames.forward);
        let emittedAnyChunk = false;

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
                throw new Error(this.resolveStreamingFailureMessage(url, error, getAbortReason()));
            }

            if (!response.ok) {
                const detail = await this.readResponseError(response);
                throw new Error(`Model streaming request failed with ${response.status}${detail ? `: ${detail}` : ''}`);
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
            const processSsePayload = async (payloadText: string): Promise<StreamChunk[]> => {
                const payload = payloadText.trim();
                if (!payload || payload === '[DONE]') {
                    return [];
                }

                let event: SSEEvent;
                try {
                    event = JSON.parse(payload);
                } catch {
                    return [];
                }

                const choice = event.choices?.[0];
                if (!choice) {
                    if (event.usage) {
                        return [{
                            type: 'done',
                            usage: this.normalizeUsage(event.usage),
                            metadata: {
                                providerUsage: event.usage,
                                promptCache: this.buildPromptCacheMetadata(event.usage, reqBody)
                            }
                        }];
                    }
                    return [];
                }

                const emitted: StreamChunk[] = [];

                const delta = this.extractStreamText(choice.delta);
                if (delta) {
                    accumulatedText += delta;
                    emitted.push({ type: 'text', content: delta });
                }

                const reasoningDelta = this.extractStreamReasoning(choice.delta);
                if (reasoningDelta) {
                    accumulatedReasoning += reasoningDelta;
                    emitted.push({ type: 'reasoning', content: reasoningDelta });
                }

                const toolCallDeltas = this.extractStreamToolCallDeltas(choice);
                if (toolCallDeltas) {
                    for (const tc of toolCallDeltas) {
                        const existing = accumulatedToolCalls.get(tc.index) ?? { args: '' };
                        if (tc.id) { existing.id = tc.id; }
                        if (tc.function?.name) { existing.name = toolNames.reverse.get(tc.function.name) || tc.function.name; }
                        if (tc.function?.arguments) { existing.args += tc.function.arguments; }
                        accumulatedToolCalls.set(tc.index, existing);
                    }
                }

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
                    emitted.push({
                        type: 'done',
                        toolCalls: toolCalls.length ? toolCalls : undefined,
                        usage: this.normalizeUsage(event.usage),
                        metadata: {
                            finishReason: choice.finish_reason,
                            provider: this.options.provider,
                            model: this.resolveModel(),
                            providerUsage: event.usage,
                            promptCache: this.buildPromptCacheMetadata(event.usage, reqBody)
                        }
                    });
                }

                return emitted;
            };
            const flushBuffer = async (source: string): Promise<StreamChunk[]> => {
                const chunks: StreamChunk[] = [];
                const lines = source
                    .split('\n')
                    .map(line => line.trim())
                    .filter(Boolean);
                for (const line of lines) {
                    if (!line.startsWith('data: ')) {
                        continue;
                    }
                    chunks.push(...(await processSsePayload(line.slice(6))));
                }
                return chunks;
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                markActivity();
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    const chunks = await processSsePayload(line.startsWith('data: ') ? line.slice(6) : '');
                    if (chunks.length) {
                        markActivity();
                    }
                    for (const chunk of chunks) {
                        emittedAnyChunk = true;
                        yield chunk;
                    }
                }
            }

            if (buffer.trim()) {
                const bufferedChunks = await flushBuffer(buffer);
                if (bufferedChunks.length) {
                    markActivity();
                }
                for (const chunk of bufferedChunks) {
                    emittedAnyChunk = true;
                    yield chunk;
                }
            }
        } catch (error: any) {
            if (!emittedAnyChunk && this.shouldFallbackToNonStreaming(error, getAbortReason())) {
                for await (const chunk of this.fallbackToNonStreamingCompletion(request)) {
                    yield chunk;
                }
                return;
            }
            throw new Error(this.resolveStreamingFailureMessage(url, error, getAbortReason()));
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

    private async readResponseError(response: Response): Promise<string> {
        try {
            const text = (await response.text()).trim();
            if (!text) {
                return '';
            }
            try {
                const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
                const message = parsed?.error?.message ?? parsed?.message;
                return message ? String(message) : text.slice(0, 300);
            } catch {
                return text.slice(0, 300);
            }
        } catch {
            return '';
        }
    }

    private async retry(request: ModelRequest, attempt: number, _lastStatus: number, retryAfter?: string | null): Promise<ModelResponse> {
        const delay = retryDelayMs(attempt, retryAfter);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.complete(request, attempt + 1);
    }

    protected createRequest(
        request: ModelRequest,
        toolNameMap: Map<string, string> = new Map()
    ): OpenAIChatCompletionRequest {
        const reasoning = request.reasoning === true;
        const messages = this.mapRequestMessages(request, toolNameMap);
        const tools = request.tools.length ? request.tools.map(tool => this.mapTool(tool, toolNameMap)) : undefined;
        if (this.provider === 'openai') {
            this.applySystemCacheAnnotation(messages);
        }
        this.trackStaticPrefix(messages, tools ?? []);
        return {
            model: this.resolveModel(),
            messages,
            tools,
            tool_choice: request.tools.length ? 'auto' : undefined,
            temperature: reasoning ? undefined : (request.temperature ?? this.options.temperature),
            max_tokens: this.options.maxTokens,
            ...(reasoning ? { reasoning_effort: 'high' as const } : {})
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

    protected shouldCacheSystemPrompt(
        text: string,
        policy: ResolvedAgentPromptCachePolicy = resolvePromptCachePolicy(this.options.promptCache)
    ): boolean {
        if (!policy.enabled || this.provider !== 'openai') {
            return false;
        }
        if (!policy.scopes.some(scope => scope === 'system' || scope === 'summary' || scope === 'memory')) {
            return false;
        }
        const normalized = String(text || '').trim();
        if (!normalized) {
            return false;
        }
        if (policy.minContentChars && normalized.length < policy.minContentChars) {
            return false;
        }
        return true;
    }

    private applySystemCacheAnnotation(messages: OpenAIMessage[]): void {
        const policy = resolvePromptCachePolicy(this.options.promptCache);
        const systemIndex = messages.findIndex(message => message.role === 'system');
        if (systemIndex < 0) {
            return;
        }
        const text = typeof messages[systemIndex].content === 'string' ? messages[systemIndex].content : '';
        if (!this.shouldCacheSystemPrompt(text, policy)) {
            return;
        }
        const type = policy.strategy === 'persistent' ? 'persistent' : 'ephemeral';
        messages[systemIndex] = {
            ...messages[systemIndex],
            content: [{ type: 'text', text, cache_control: { type } }]
        };
    }

    protected computeStaticPrefixHash(messages: OpenAIMessage[], tools: OpenAIToolDefinition[]): string {
        const systemText = messages
            .filter(message => message.role === 'system')
            .map(message => typeof message.content === 'string' ? message.content : JSON.stringify(message.content))
            .join('\n');
        const toolText = tools.map(tool => tool.function?.name ?? '').join(',');
        const input = `${systemText}\n---tools---\n${toolText}`;
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
        }
        return String(hash);
    }

    private trackStaticPrefix(messages: OpenAIMessage[], tools: OpenAIToolDefinition[]): void {
        const hash = this.computeStaticPrefixHash(messages, tools);
        this.staticPrefixBroken = this.lastStaticPrefixHash !== undefined && this.lastStaticPrefixHash !== hash;
        this.lastStaticPrefixHash = hash;
    }

    private normalizeUsage(usage?: OpenAIChatCompletionResponse['usage']): ModelTokenUsage | undefined {
        if (!usage) {
            return undefined;
        }
        return {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            cachedPromptTokens: usage.prompt_tokens_details?.cached_tokens
        };
    }

    protected mapRequestMessages(
        request: ModelRequest,
        toolNameMap: Map<string, string> = new Map()
    ): OpenAIMessage[] {
        const mapped = this.mapMessages(request.messages, toolNameMap);
        const contextMessages = this.mapContextMessages(request.summary, request.memory);
        if (!contextMessages.length) {
            return mapped;
        }
        // Keep the static system prompt at the front of the prefix; the
        // dynamic summary/memory segments must follow it, never precede it,
        // otherwise the provider prompt cache breaks on every turn.
        const firstSystemIndex = mapped.findIndex(message => message.role === 'system');
        if (firstSystemIndex < 0) {
            return contextMessages.concat(mapped);
        }
        return [
            ...mapped.slice(0, firstSystemIndex + 1),
            ...contextMessages,
            ...mapped.slice(firstSystemIndex + 1)
        ];
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
        let pendingReasoningContent: string | undefined;

        for (const message of messages) {
            if (message.role === 'assistant' && this.hasToolCalls(message)) {
                const reasoningContent = String(message.metadata?.reasoningContent || '').trim() || undefined;
                const toolCalls = this.getToolCalls(message).filter(call => call.input !== undefined);
                if (toolCalls.length) {
                    result.push({
                        role: 'assistant',
                        content: getAgentMessageText(message) || null,
                        tool_calls: toolCalls.map(call => this.mapToolCall(call, toolNameMap)),
                        ...(reasoningContent ? { reasoning_content: reasoningContent } : {})
                    });
                    activeToolCallIds = new Set(toolCalls.map(call => call.id));
                } else {
                    activeToolCallIds = undefined;
                    pendingReasoningContent = reasoningContent;
                }
                continue;
            }

            if (message.role === 'tool') {
                const toolCallId = message.toolCallId ?? message.name ?? `tool-${result.length}`;
                if (!activeToolCallIds || !activeToolCallIds.has(toolCallId)) {
                    result.push({
                        role: 'assistant',
                        content: null,
                        tool_calls: [this.mapSyntheticToolCall(message, toolCallId, toolNameMap)],
                        ...(pendingReasoningContent ? { reasoning_content: pendingReasoningContent } : {})
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
            pendingReasoningContent = undefined;
            const mapped: OpenAIMessage = {
                role: message.role,
                content: this.mapMessageContent(message)
            };
            if (message.role === 'assistant') {
                const reasoningContent = String(message.metadata?.reasoningContent || '').trim();
                if (reasoningContent) {
                    mapped.reasoning_content = reasoningContent;
                }
            }
            result.push(mapped);
        }

        return result;
    }

    protected mapMessageContent(message: AgentMessage): OpenAIMessage['content'] {
        if (message.role === 'tool' || message.role === 'assistant' || message.role === 'system') {
            return getAgentMessageText(message) || null;
        }
        const parts = this.mapMessageParts(resolveAgentMessageParts(message));
        if (!parts.length) {
            return null;
        }
        if (parts.length === 1 && parts[0].type === 'text') {
            return parts[0].text || null;
        }
        return parts;
    }

    protected mapMessageParts(parts: AgentMessagePart[]): OpenAIContentPart[] {
        const mapped: OpenAIContentPart[] = [];
        for (const part of parts) {
            if (part.type === 'text') {
                const text = String(part.text || '');
                if (text) {
                    mapped.push({ type: 'text', text });
                }
                continue;
            }
            mapped.push(this.mapImagePart(part));
        }
        return mapped;
    }

    protected mapImagePart(part: AgentImageMessagePart): OpenAIContentPart {
        return {
            type: 'image_url',
            image_url: {
                url: part.imageUrl,
                detail: part.detail
            }
        };
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

    protected extractStreamToolCallDeltas(choice?: SSEChoice | null): Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
            name?: string;
            arguments?: string;
        };
    }> {
        if (!choice) {
            return [];
        }

        const directToolCalls = choice.delta?.tool_calls;
        if (Array.isArray(directToolCalls) && directToolCalls.length) {
            return directToolCalls.map((toolCall, index) => ({
                index: typeof toolCall.index === 'number' ? toolCall.index : index,
                id: toolCall.id,
                type: toolCall.type,
                function: toolCall.function
            }));
        }

        const legacyFunctionCall = (choice.delta as any)?.function_call ?? choice.message?.function_call;
        if (legacyFunctionCall?.name || legacyFunctionCall?.arguments) {
            return [{
                index: 0,
                function: {
                    name: legacyFunctionCall.name,
                    arguments: legacyFunctionCall.arguments
                }
            }];
        }

        const messageToolCalls = choice.message?.tool_calls;
        if (Array.isArray(messageToolCalls) && messageToolCalls.length) {
            return messageToolCalls.map((toolCall, index) => ({
                index,
                id: toolCall.id,
                type: toolCall.type,
                function: toolCall.function
            }));
        }

        if (Array.isArray(choice.delta?.content)) {
            const contentToolCalls = choice.delta.content
                .map((part: any, index: number) => {
                    if (!part || typeof part !== 'object') {
                        return null;
                    }
                    if (Array.isArray(part.tool_calls) && part.tool_calls.length) {
                        return part.tool_calls.map((toolCall: any, nestedIndex: number) => ({
                            index: typeof toolCall.index === 'number' ? toolCall.index : nestedIndex,
                            id: toolCall.id,
                            type: toolCall.type,
                            function: toolCall.function
                        }));
                    }
                    if (part.type === 'tool_call' || part.type === 'tool_calls' || part.function) {
                        return [{
                            index,
                            id: part.id,
                            type: part.type,
                            function: part.function ?? {
                                name: part.name,
                                arguments: part.arguments
                            }
                        }];
                    }
                    return null;
                })
                .filter(Boolean)
                .flat() as Array<{ index: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
            if (contentToolCalls.length) {
                return contentToolCalls;
            }
        }

        return [];
    }

    protected createTimeoutContext(external?: AbortSignal): { signal?: AbortSignal, cleanup(): void } {
        const timeout = this.options.timeoutMs;
        if ((!timeout || timeout <= 0) && !external) {
            return {
                cleanup() {
                    return;
                }
            };
        }

        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        if (external) {
            if (external.aborted) {
                controller.abort();
            } else {
                external.addEventListener('abort', onExternalAbort, { once: true });
            }
        }
        const handle = timeout && timeout > 0 ? setTimeout(() => controller.abort(), timeout) : undefined;
        return {
            signal: controller.signal,
            cleanup() {
                if (handle) {
                    clearTimeout(handle);
                }
                if (external) {
                    external.removeEventListener('abort', onExternalAbort);
                }
            }
        };
    }

    protected createStreamingTimeoutContext(external?: AbortSignal): {
        signal?: AbortSignal;
        cleanup(): void;
        markActivity(): void;
        getAbortReason(): string | undefined;
    } {
        const timeout = this.options.timeoutMs;
        if ((!timeout || timeout <= 0) && !external) {
            return {
                cleanup() {
                    return;
                },
                markActivity() {
                    return;
                },
                getAbortReason() {
                    return undefined;
                }
            };
        }

        const controller = new AbortController();
        let abortReason: string | undefined;
        let stallHandle: ReturnType<typeof setTimeout> | undefined;
        let totalHandle: ReturnType<typeof setTimeout> | undefined;
        const onExternalAbort = () => controller.abort();
        if (external) {
            if (external.aborted) {
                controller.abort();
            } else {
                external.addEventListener('abort', onExternalAbort, { once: true });
            }
        }
        const armTotalTimer = () => {
            if (!timeout || timeout <= 0) {
                return;
            }
            if (totalHandle) {
                clearTimeout(totalHandle);
            }
            totalHandle = setTimeout(() => {
                abortReason = `Model stream timed out after ${timeout}ms.`;
                controller.abort();
            }, timeout);
        };
        const armStallTimer = () => {
            if (!timeout || timeout <= 0) {
                return;
            }
            if (stallHandle) {
                clearTimeout(stallHandle);
            }
            // Reasoning models can legitimately stay silent while planning or
            // assembling tool calls. Honour the configured timeout instead of
            // imposing an undocumented 15-second ceiling.
            const stallTimeout = timeout;
            stallHandle = setTimeout(() => {
                abortReason = `Model stream stalled after ${stallTimeout}ms without output.`;
                controller.abort();
            }, stallTimeout);
        };

        armTotalTimer();
        armStallTimer();
        return {
            signal: controller.signal,
            cleanup() {
                if (totalHandle) {
                    clearTimeout(totalHandle);
                }
                if (stallHandle) {
                    clearTimeout(stallHandle);
                }
                if (external) {
                    external.removeEventListener('abort', onExternalAbort);
                }
            },
            markActivity() {
                // Reasoning streams emit chunks continuously, so a one-shot
                // total cap would abort a live-but-long reasoning turn. Re-arm
                // both timers on any activity; only a silent stream is aborted.
                armTotalTimer();
                armStallTimer();
            },
            getAbortReason() {
                return abortReason;
            }
        };
    }

    protected resolveStreamingFailureMessage(
        url: string,
        error: unknown,
        abortReason?: string
    ): string {
        if (abortReason) {
            return `${abortReason} (${url})`;
        }
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith('Model streaming request failed')) {
            return message;
        }
        return `Model streaming request failed: ${message} (${url})`;
    }

    protected shouldFallbackToNonStreaming(error: unknown, abortReason?: string): boolean {
        if (abortReason) {
            return true;
        }
        const message = String(error instanceof Error ? error.message : error || '').toLowerCase();
        return message.includes('fetch failed')
            || message.includes('network')
            || message.includes('streaming request failed')
            || message.includes('aborted')
            || message.includes('timeout');
    }

    protected async *fallbackToNonStreamingCompletion(request: ModelRequest): AsyncGenerator<StreamChunk> {
        const completed = await this.complete(request);
        const reasoning = String(completed.metadata?.reasoningContent || '').trim();
        if (reasoning) {
            yield {
                type: 'reasoning',
                content: reasoning,
                metadata: {
                    provider: completed.metadata?.provider,
                    model: completed.metadata?.model,
                    fallback: 'non_stream'
                }
            };
        }
        if (completed.message) {
            yield {
                type: 'text',
                content: completed.message,
                metadata: {
                    provider: completed.metadata?.provider,
                    model: completed.metadata?.model,
                    fallback: 'non_stream'
                }
            };
        }
        yield {
            type: 'done',
            toolCalls: completed.toolCalls,
            usage: completed.metadata?.usage,
            metadata: {
                ...completed.metadata,
                promptCache: completed.metadata?.promptCache ?? this.buildPromptCacheMetadata(completed.metadata?.providerUsage, this.createRequest(request, new Map())),
                fallback: 'non_stream'
            }
        };
    }

    private buildPromptCacheMetadata(
        usage?: OpenAIChatCompletionResponse['usage'],
        requestBody?: OpenAIChatCompletionRequest
    ) {
        const requested = resolvePromptCachePolicy(this.options.promptCache);
        const annotated = !!requestBody?.messages?.some(message =>
            Array.isArray(message.content)
            && message.content.some(part => !!(part as OpenAIContentPart).cache_control?.type)
        );
        const supported: PromptCacheRuntimeMetadata['supported'] =
            this.provider === 'openai' ? 'full'
            : this.provider === 'deepseek' ? 'partial'
            : 'observe_only';
        return buildPromptCacheRuntimeMetadata(this.options.promptCache, {
            provider: this.options.provider ?? 'openai-compatible',
            supported,
            applied: annotated,
            appliedStrategy: annotated ? requested.strategy : undefined,
            appliedScopes: annotated ? ['system'] : undefined,
            observedCachedPromptTokens: usage?.prompt_tokens_details?.cached_tokens,
            prefixBroken: this.staticPrefixBroken
        });
    }
}
