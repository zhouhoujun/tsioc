import { MemoryStore } from '../memory/MemoryStore';

export interface AgentToolContext {
    sessionId: string;
    memory: MemoryStore;
}

export interface AgentToolExecutionHints {
    readOnly?: boolean;
    sideEffect?: boolean;
    requiresSequential?: boolean;
}

export interface AgentToolDefinition {
    name: string;
    description: string;
    inputSchema?: Record<string, any>;
    toolset?: string;
    source?: string;
    execution?: AgentToolExecutionHints;
}

export interface AgentTool extends AgentToolDefinition {
    getDefinition?(): AgentToolDefinition;
    invoke(input: any, context: AgentToolContext): Promise<any>;
}
