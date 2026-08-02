import { Abstract } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSearchMatch, SessionSearchOptions } from '../memory/SessionStore';
import { AgentMessage } from './AgentMessage';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentTurnInput } from './AgentTurnInput';
import { StreamChunk } from '../model/StreamChunk';
import { SynthesisOptions, SynthesisReport } from '../context/AgentContextManager';
import { FileSnapshot } from '../harness/FileSnapshotStore';

export interface CancelTurnResult {
    cancelled: boolean;
    compensated: number;
    toolCallIds: string[];
}

export interface FileUndoRedoResult {
    filePath: string;
    restored: 'content' | 'deleted' | 'none';
    snapshot?: FileSnapshot;
}

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
     * Returns the outcome of the cancellation request: whether a running turn
     * was found and cancelled, and how many side-effecting tool calls were
     * rolled back as part of the cancellation (see the AgentTool compensation
     * contract). When the session has registered child (sub-agent) sessions,
     * cancellation cascades to them as well.
     * Override this in concrete runtimes that support turn cancellation.
     */
    async cancelTurn(_sessionId: string): Promise<CancelTurnResult> {
        // no-op by default
        return { cancelled: false, compensated: 0, toolCallIds: [] };
    }

    /**
     * Register a child (sub-agent) session under a parent session so that
     * cancelling the parent turn also cancels the child turn.
     * `metadata` (spawner context such as goal/toolsets/model) is persisted by
     * runtimes backed by a delegation graph store.
     * Override this in concrete runtimes that support session hierarchies.
     */
    registerChildSession(_parentSessionId: string, _childSessionId: string, _metadata?: Record<string, any>): void {
        // no-op by default
    }

    /**
     * Remove a previously registered child session link. `status` records how
     * the child turn ended for persisted delegation edges.
     * Override this in concrete runtimes that support session hierarchies.
     */
    unregisterChildSession(_parentSessionId: string, _childSessionId: string, _status?: 'active' | 'completed' | 'failed' | 'cancelled'): void {
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

    /**
     * Set an explicit model profile for a specific session. While set, every
     * model request for the session routes to that profile and skips
     * complexity/routes matching. Delegation workers use this to pin a
     * worker class (spawn_agent / llm_task) to a specific model profile.
     * Override this in concrete runtimes that support session-scoped model routing.
     */
    setSessionModelProfile(_sessionId: string, _profileName: string): void {
        // no-op by default
    }

    /**
     * Clear a previously set model profile for a session, restoring default
     * complexity/routes based routing.
     * Override this in concrete runtimes that support session-scoped model routing.
     */
    clearSessionModelProfile(_sessionId: string): void {
        // no-op by default
    }

    /**
     * Enable or disable read-only plan mode for a session. While enabled, tools
     * that are not declared read-only are denied before execution, so the agent
     * may inspect state, search memory, and propose changes without mutating
     * anything.
     * Override this in concrete runtimes that support session-scoped plan mode.
     */
    setPlanMode(_sessionId: string, _enabled: boolean): void {
        // no-op by default
    }

    /**
     * Whether the given session is currently in read-only plan mode.
     * Override this in concrete runtimes that support session-scoped plan mode.
     */
    isPlanMode(_sessionId: string): boolean {
        // no-op by default
        return false;
    }

    /**
     * Revert the most recent recorded file change for a session (restore the
     * pre-change content). Override in runtimes backed by a FileSnapshotStore.
     */
    async undoFileChange(_sessionId: string): Promise<FileUndoRedoResult> {
        return { filePath: '', restored: 'none' };
    }

    /**
     * Re-apply the most recently undone file change for a session.
     * Override in runtimes backed by a FileSnapshotStore.
     */
    async redoFileChange(_sessionId: string): Promise<FileUndoRedoResult> {
        return { filePath: '', restored: 'none' };
    }

    /**
     * List the undoable file snapshots recorded for a session (oldest first).
     * Override in runtimes backed by a FileSnapshotStore.
     */
    listFileSnapshots(_sessionId: string): FileSnapshot[] {
        return [];
    }
}
