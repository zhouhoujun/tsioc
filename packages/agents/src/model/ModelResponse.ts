export interface AgentToolCall {
    id: string;
    name: string;
    input?: any;
}

export interface ModelResponse {
    message?: string;
    toolCalls?: AgentToolCall[];
    stopReason?: 'end' | 'tool' | 'max-tool-rounds';
    metadata?: Record<string, any>;
}
