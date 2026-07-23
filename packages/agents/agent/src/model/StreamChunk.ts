import { AgentToolCall } from './ModelResponse';

export type StreamChunkType = 'text' | 'reasoning' | 'tool_call' | 'done';

export interface StreamChunk {
    type: StreamChunkType;
    content?: string;
    toolCalls?: AgentToolCall[];
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        cachedPromptTokens?: number;
    };
    metadata?: Record<string, any>;
}
