export type AgentRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentMessage {
    id: string;
    role: AgentRole;
    content: string;
    name?: string;
    toolCallId?: string;
    createdAt: number;
    metadata?: Record<string, any>;
}
