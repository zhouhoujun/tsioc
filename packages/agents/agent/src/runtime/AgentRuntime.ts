import { Abstract } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { AgentMemoryRecord } from '../memory/MemoryStore';
import { AgentMessage } from './AgentMessage';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentTurnInput } from './AgentTurnInput';
import { StreamChunk } from '../model/StreamChunk';

@Abstract()
export abstract class AgentRuntime {
    abstract runTurn(sessionId: string, input: string, principalId?: string): Promise<AgentTurnResult>;

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

    abstract executeTurn(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult>;

    abstract processTurn(input: AgentTurnInput): Promise<AgentTurnResult>;

    abstract runStreamingTurn(sessionId: string, input: string, principalId?: string): AsyncGenerator<StreamChunk>;

    abstract putMemory(sessionId: string, key: string, value: string, scope?: AgentMemoryRecord['scope']): Promise<AgentMemoryRecord>;

    abstract searchMemory(sessionId: string, query: string): Promise<AgentMemoryRecord[]>;

    abstract getMessages(sessionId: string): Promise<AgentMessage[]>;

    /**
     * Set a toolset filter for a specific session. When set, only tools
     * matching one of the listed toolsets will be exposed to the agent.
     * Override this in concrete runtimes that support session-scoped filtering.
     */
    setSessionToolFilter(_sessionId: string, _toolsets: string[]): void {
        // no-op by default
    }

    /**
     * Clear a previously set toolset filter for a session.
     * Override this in concrete runtimes that support session-scoped filtering.
     */
    clearSessionToolFilter(_sessionId: string): void {
        // no-op by default
    }
}
