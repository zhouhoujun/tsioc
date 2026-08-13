import { Abstract } from '@tsdi/ioc';
import { RunContext } from '@tsdi/core';
import { AgentMemoryRecord } from '../memory/MemoryStore';
import { SessionSearchMatch, SessionSearchOptions } from '../memory/SessionStore';
import { AgentMessage, AgentTurnMessageInput } from './AgentMessage';
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
    async createGoal(_input: import('../goal').CreateGoalInput, _sessionId?: string): Promise<import('../goal').Goal> { throw new Error('Goal store unavailable.'); }
    async listGoals(_status?: import('../goal').GoalStatus): Promise<import('../goal').Goal[]> { return []; }
    async getGoal(_goalId: string): Promise<import('../goal').Goal | undefined> { return undefined; }
    async getSessionGoal(_sessionId: string): Promise<import('../goal').Goal | undefined> { return undefined; }
    async linkSessionGoal(_sessionId: string, _goalId?: string): Promise<void> { throw new Error('Goal store unavailable.'); }
    async updateGoal(_goalId: string, _patch: Partial<Pick<import('../goal').Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<import('../goal').Goal> { throw new Error('Goal store unavailable.'); }
    abstract runTurn(
        sessionId: string,
        input: string,
        principalId?: string,
        message?: AgentTurnMessageInput,
        profile?: string,
        agent?: import('./AgentTurnInput').AgentTurnAgentConfig
    ): Promise<AgentTurnResult>;

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;

    abstract executeTurn(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult>;

    abstract processTurn(input: AgentTurnInput): Promise<AgentTurnResult>;

    abstract runStreamingTurn(
        sessionId: string,
        input: string,
        principalId?: string,
        message?: AgentTurnMessageInput,
        profile?: string,
        agent?: import('./AgentTurnInput').AgentTurnAgentConfig
    ): AsyncGenerator<StreamChunk>;

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
     * anything. Delegates to the `plan` archetype when the runtime supports
     * archetypes (see setSessionArchetype).
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
     * P70: set the active archetype for a session ('build' | 'plan' | 'review'
     * or a custom name from AgentOptions.archetypes). Pass undefined/null to
     * restore the configured default archetype. Plan mode is derived from the
     * active archetype's readOnly flag.
     * Override this in concrete runtimes that support session-scoped archetypes.
     */
    setSessionArchetype(_sessionId: string, _archetype: string | null | undefined): void {
        // no-op by default
    }

    /**
     * P70: the active archetype name for a session (resolved with the
     * configured default).
     * Override this in concrete runtimes that support session-scoped archetypes.
     */
    getSessionArchetype(_sessionId: string): string {
        return 'build';
    }

    /**
     * P70: names of all available archetypes (built-ins plus configured).
     * Override this in concrete runtimes that support session-scoped archetypes.
     */
    listArchetypes(): string[] {
        return ['build', 'plan', 'review'];
    }

    /**
     * Override the OS sandbox mode for a session. Pass undefined/null to
     * restore the configured default from AgentOptions.sandbox.mode.
     */
    setSessionSandboxMode(
        _sessionId: string,
        _mode?: import('../harness/sandbox-exec').SandboxMode | null
    ): void {
        // no-op by default
    }

    /**
     * Return the session-scoped sandbox override, or undefined when the
     * session inherits the configured default sandbox mode.
     */
    getSessionSandboxMode(_sessionId: string): import('../harness/sandbox-exec').SandboxMode | undefined {
        return undefined;
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

    /**
     * Capture the current working tree as a git-backed step snapshot and bind
     * it to the given session message id. Returns null when the workspace is
     * not a git repo or has no tracked changes. Override in runtimes backed by
     * a GitStepSnapshotStore.
     */
    captureGitStepSnapshot(
        _sessionId: string,
        _workspace: string,
        _messageId: string
    ): import('../harness/GitStepSnapshotStore').GitStepSnapshot | null {
        return null;
    }

    /**
     * Revert the working tree to the git snapshot bound to a session message
     * id (full-tree restore). Override in runtimes backed by a
     * GitStepSnapshotStore.
     */
    async revertGitStepSnapshot(
        _sessionId: string,
        _messageId: string
    ): Promise<import('../harness/GitStepSnapshotStore').GitRevertResult> {
        return { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    /**
     * Restore the working tree captured just before the last git revert for a
     * session. Override in runtimes backed by a GitStepSnapshotStore.
     */
    async unrevertGitStepSnapshot(
        _sessionId: string
    ): Promise<import('../harness/GitStepSnapshotStore').GitRevertResult> {
        return { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    /**
     * List the git step snapshots captured for a session (oldest first).
     * Override in runtimes backed by a GitStepSnapshotStore.
     */
    listGitStepSnapshots(
        _sessionId: string
    ): import('../harness/GitStepSnapshotStore').GitStepSnapshot[] {
        return [];
    }

    /**
     * Diff a session's git step snapshot (by message id or snapshot id) against
     * the current working tree. Override in runtimes backed by a
     * GitStepSnapshotStore.
     */
    diffGitStepSnapshot(
        _sessionId: string,
        _ref: string
    ): import('../harness/GitStepSnapshotStore').GitStepDiff | null {
        return null;
    }

    /**
     * Register an in-process JS function hook for a lifecycle stage. Function
     * hooks run before shell hooks for the same stage, and a `beforeTool`
     * function hook may return `input` on its result to rewrite the tool input
     * before execution.
     * Override this in concrete runtimes that support function hooks.
     */
    registerHookFunction(
        _stage: import('../hooks/AgentHooks').AgentLifecycleHookStage,
        _hook: import('../hooks/AgentHooks').AgentFunctionHookDefinition
    ): void {
        // no-op by default
    }

    /**
     * Remove a previously registered function hook. Without a name, all
     * function hooks for the stage are removed.
     * Override this in concrete runtimes that support function hooks.
     */
    unregisterHookFunction(
        _stage: import('../hooks/AgentHooks').AgentLifecycleHookStage,
        _name?: string
    ): void {
        // no-op by default
    }

    /**
     * P74: ensure the session has an automatically generated title, generating
     * one from the conversation transcript when the session has no title yet
     * and automatic titles are enabled. Returns the session title (existing or
     * newly generated), or undefined when no title is available/derived.
     * Override this in concrete runtimes that support automatic titles.
     */
    async ensureSessionTitle(_sessionId: string): Promise<string | undefined> {
        return undefined;
    }

    /**
     * P74: ensure the session has an automatically generated display summary,
     * generating one when the session has no focusSummary yet and automatic
     * summaries are enabled. An existing manually-set focusSummary is never
     * overwritten. Returns the focusSummary (existing or newly generated), or
     * undefined when none is available/derived.
     * Override this in concrete runtimes that support automatic summaries.
     */
    async refreshSessionSummary(_sessionId: string): Promise<string | undefined> {
        return undefined;
    }

    /**
     * P98: return the current token budget state for a session (per-session and
     * per-thread scopes when configured). Returns an empty array when the
     * runtime does not track token budgets.
     * Override this in concrete runtimes backed by a TokenBudgetTracker.
     */
    async getTokenBudgetState(
        _sessionId: string
    ): Promise<import('../harness/TokenBudgetTracker').TokenBudgetScopeState[]> {
        return [];
    }
}
