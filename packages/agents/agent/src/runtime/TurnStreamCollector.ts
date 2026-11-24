import { AgentStreamChunkEvent } from './AgentEvents';
import { describeToolCallNames } from './tool-dispatch-policy';
import type { AgentToolCall, ModelResponse } from '../model/ModelResponse';
import type { ModelRequest } from '../model/ModelRequest';
import type { StreamChunk } from '../model/StreamChunk';

export interface TurnStreamHost {
    source: object;
    stream(request: ModelRequest): AsyncIterable<StreamChunk>;
    publish(event: any): Promise<void>;
    estimateTokens(text: string): number;
    buildCompletedEvent(sessionId: string, response: ModelResponse): any;
    /** P3.1: complete tool calls delivered before the stream finishes. */
    onToolCalls?(calls: AgentToolCall[]): void;
}

/** Only keep tool calls whose id was not already seen. */
export function collectFreshStreamingToolCalls(seen: Set<string>, incoming?: AgentToolCall[]): AgentToolCall[] {
    if (!incoming?.length) {
        return [];
    }
    const fresh: AgentToolCall[] = [];
    for (const toolCall of incoming) {
        const id = String(toolCall.id || '').trim() || `tool-${toolCall.name}-${fresh.length}`;
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        fresh.push({ ...toolCall, id });
    }
    return fresh;
}

/**
 * Consume a model stream, publishing chunk events and assembling the final
 * response. Live token estimates advance before the provider's usage chunk;
 * estimates are tagged and never persisted.
 */
export async function* collectStreamingResponse(
    host: TurnStreamHost,
    sessionId: string,
    request: ModelRequest
): AsyncGenerator<StreamChunk, ModelResponse, void> {
    let message = '';
    let reasoningContent = '';
    let toolCalls: AgentToolCall[] = [];
    let usage: Record<string, any> | undefined;
    let metadata: Record<string, any> = {};
    const seenToolCalls = new Set<string>();
    let estimatedCompletionTokens = 0;
    let estimatedPromptTokens: number | undefined;
    let estimatedCachedPromptTokens: number | undefined;

    const resolveChunkUsage = (chunk: StreamChunk): Record<string, any> | undefined => {
        if (chunk.usage) {
            return chunk.usage as Record<string, any>;
        }
        if (chunk.type !== 'text' && chunk.type !== 'reasoning') {
            return undefined;
        }
        return {
            ...(estimatedPromptTokens !== undefined ? {
                promptTokens: estimatedPromptTokens,
                totalTokens: estimatedPromptTokens + estimatedCompletionTokens
            } : {}),
            ...(estimatedCachedPromptTokens !== undefined ? { cachedPromptTokens: estimatedCachedPromptTokens } : {}),
            completionTokens: estimatedCompletionTokens,
            estimated: true
        };
    };

    for await (const chunk of host.stream(request)) {
        const freshToolCalls = collectFreshStreamingToolCalls(seenToolCalls, chunk.toolCalls);
        if (chunk.type === 'text') {
            message += chunk.content ?? '';
            estimatedCompletionTokens += host.estimateTokens(chunk.content ?? '');
        }
        if (chunk.type === 'reasoning') {
            reasoningContent += chunk.content ?? '';
            estimatedCompletionTokens += host.estimateTokens(chunk.content ?? '');
        }
        if (chunk.usage) {
            const source = chunk.usage as Record<string, any>;
            usage = source;
            if (typeof source.promptTokens === 'number' && Number.isFinite(source.promptTokens) && estimatedPromptTokens === undefined) {
                estimatedPromptTokens = source.promptTokens;
            }
            if (typeof source.cachedPromptTokens === 'number' && Number.isFinite(source.cachedPromptTokens) && estimatedCachedPromptTokens === undefined) {
                estimatedCachedPromptTokens = source.cachedPromptTokens;
            }
        }
        const chunkUsage = resolveChunkUsage(chunk);
        if (chunk.type !== 'done' || chunk.usage || freshToolCalls.length) {
            await host.publish(new AgentStreamChunkEvent(
                host.source,
                sessionId,
                chunk.type === 'done' && freshToolCalls.length ? 'tool_call' : chunk.type,
                chunk.type === 'tool_call' || (chunk.type === 'done' && freshToolCalls.length)
                    ? describeToolCallNames(freshToolCalls)
                    : chunk.content,
                freshToolCalls.length ? freshToolCalls : chunk.toolCalls,
                chunkUsage
            ));
        }
        if (freshToolCalls.length) {
            toolCalls = toolCalls.concat(freshToolCalls);
            host.onToolCalls?.(freshToolCalls);
        }
        if (chunk.metadata) {
            metadata = { ...metadata, ...chunk.metadata };
        }
        if (chunk.type === 'done' && freshToolCalls.length) {
            yield {
                type: 'tool_call',
                content: describeToolCallNames(freshToolCalls),
                toolCalls: freshToolCalls
            };
        }
        if (chunk.type !== 'done' || chunk.usage) {
            yield {
                type: chunk.type,
                content: chunk.type === 'tool_call' ? describeToolCallNames(freshToolCalls) : chunk.content,
                toolCalls: chunk.type === 'tool_call' ? freshToolCalls : undefined,
                usage: chunkUsage
            };
        }
    }

    const response: ModelResponse = {
        message,
        toolCalls: toolCalls.length ? toolCalls : undefined,
        metadata: {
            ...metadata,
            usage,
            reasoningContent: reasoningContent || undefined
        }
    };
    await host.publish(host.buildCompletedEvent(sessionId, response));
    return response;
}
