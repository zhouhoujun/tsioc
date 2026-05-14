export interface AgentToolCall {
    id: string;
    name: string;
    input?: any;
}

export interface ModelTokenUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cachedPromptTokens?: number;
}

export interface ModelResponse {
    message?: string;
    toolCalls?: AgentToolCall[];
    stopReason?: 'end' | 'tool' | 'max-tool-rounds';
    metadata?: {
        provider?: string;
        model?: string;
        finishReason?: string;
        reasoningContent?: string;
        usage?: ModelTokenUsage | Record<string, any>;
        [key: string]: any;
    };
}
