import { MemoryStore } from '../memory/MemoryStore';

export interface AgentToolContext {
    sessionId: string;
    memory: MemoryStore;
}

export interface AgentToolDefinition {
    name: string;
    description: string;
    inputSchema?: Record<string, any>;
}

export interface AgentTool extends AgentToolDefinition {
    invoke(input: any, context: AgentToolContext): Promise<any>;
}
