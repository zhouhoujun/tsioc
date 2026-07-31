import { Abstract } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSearchMatch, SessionSearchOptions } from '../memory/SessionStore';
import { AgentMessage } from './AgentMessage';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentTurnInput } from './AgentTurnInput';
import { StreamChunk } from '../model/StreamChunk';
import { SynthesisOptions, SynthesisReport } from '../context/AgentContextManager';

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

    abstract searchSessions(query: string, options?: SessionSearchOptions): Promise<SessionSearchMatch[]>;

    /**
     * Request cancellation of the currently running turn for a session.
     * Returns true when a running turn was found and cancellation was requested;
     * returns false when no turn is currently running (or it is already cancelling).
     * When the session has registered child (sub-agent) sessions, cancellation
     * cascades to them as well.
     * Override this in concrete runtimes that support turn cancellation.
     */
    async cancelTurn(_sessionId: string): Promise<boolean> {
        // no-op by default
        return false;
    }

    /**
     * Register a child (sub-agent) session under a parent session so that
     * cancelling the parent turn also cancels the child turn.
     * Override this in concrete runtimes that support session hierarchies.
     */
    registerChildSession(_parentSessionId: string, _childSessionId: string): void {
        // no-op by default
    }

    /**
     * Remove a previously registered child session link.
     * Override this in concrete runtimes that support session hierarchies.
     */
    unregisterChildSession(_parentSessionId: string, _childSessionId: string): void {
        // no-op by default
    }

    abstract synthesizeExperiences(options?: SynthesisOptions): SynthesisReport;

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
