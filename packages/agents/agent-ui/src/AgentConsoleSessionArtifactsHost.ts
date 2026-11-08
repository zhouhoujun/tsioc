import type { AgentTurnMessageInput } from '@tsdi/agent';
import type { AgentConsolePlanTodoItem } from './AgentConsoleSessionState';
import { AgentConsoleKeyInputHost } from './AgentConsoleKeyInputHost';
import {
    refreshCompactionDigest,
    refreshSummaryQualityDigest,
    refreshTurnDiagnosticsDigest,
    refreshUsageDigest
} from './AgentConsoleDiagnosticsView';
import { mergeTodoPlanForSessionsView } from './AgentConsoleTodoPlanCommands';
import { loadLocalTodoPlan } from './AgentConsoleTodoView';
import { normalizeTodoStatus } from './AgentConsolePlanState';
import { todoPlanCommandHost } from './AgentConsoleHostFactories';
import { loadCodingTasks as loadCodingTasksFn } from './AgentConsoleCodingTaskHandlers';

/** Turn artifacts, digest refreshes and session todo-plan projections. */
export abstract class AgentConsoleSessionArtifactsHost extends AgentConsoleKeyInputHost {
    protected abstract loadCodingTasks(sessionId?: string, sessionIds?: string[]): Promise<any[]>;
    protected abstract refreshScheduledTasks(): Promise<void>;

    /** A primary click outside the popup dismisses transient menu chrome. */
    onTerminalBackgroundClick(): void {
        if (this.state.selectMenu) {
            void this.state.cancelSelectMenu();
            return;
        }
        if (this.state.textOverlay) {
            this.state.closeTextOverlay();
        }
    }

    protected async refreshTurnArtifacts(): Promise<void> {
        await Promise.allSettled([
            this.refreshTools(),
            this.refreshScheduledTasks(),
            this.refreshTodoPlan(),
            this.loadCodingTasks(),
            this.refreshUsageDigest(),
            this.refreshSummaryQualityDigest(),
            this.refreshCompactionDigest(),
            this.refreshTurnDiagnosticsDigest()
        ]);
    }

    protected async refreshUsageDigest(): Promise<void> {
        return refreshUsageDigest(this.sessionService, this.state, this.translator);
    }

    protected async refreshTurnDiagnosticsDigest(): Promise<void> {
        return refreshTurnDiagnosticsDigest(this.sessionService, this.state, this.translator);
    }

    protected async refreshCompactionDigest(): Promise<void> {
        return refreshCompactionDigest(this.sessionService, this.state, this.translator);
    }

    protected async refreshSummaryQualityDigest(): Promise<void> {
        return refreshSummaryQualityDigest(this.sessionService, this.state, this.translator);
    }

    protected async mergeTodoPlanForSessions(
        sessionId: string,
        sessions: Array<{ id: string; updatedAt?: number }>
    ): Promise<{ todos: AgentConsolePlanTodoItem[]; sourceSessionId?: string } | null> {
        return mergeTodoPlanForSessionsView(todoPlanCommandHost(this), sessionId, sessions);
    }

    protected async loadLocalTodoPlan(sessionId: string): Promise<AgentConsolePlanTodoItem[]> {
        return loadLocalTodoPlan(sessionId, this.toolRegistry, this.state, (status: unknown) => normalizeTodoStatus(status)) as any;
    }

    /**
     * Todos belong to one session (one tab): never merge sibling sessions'
     * plans, or every tab in the same workspace shows the same Todos block.
     * Project-level views (`/threadplan`) opt into aggregation explicitly.
     */
    protected async refreshTodoPlan(sessionId = this.state.sessionId): Promise<void> {
        const merged = await this.mergeTodoPlanForSessions(sessionId, [{ id: sessionId }]);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId);
    }

    protected async refreshThreadTodoPlan(
        sessionId = this.state.sessionId,
        sessions = this.resolveThreadSessionsFor(sessionId)
    ): Promise<void> {
        const merged = await this.mergeTodoPlanForSessions(sessionId, sessions);
        if (!merged) {
            return;
        }
        this.state.setPlanTodos(merged.todos, merged.sourceSessionId, 'thread');
    }

    protected async loadThreadCodingTasks(
        sessionId = this.state.sessionId,
        sessionIds = this.resolveThreadSessionIdsFor(sessionId)
    ): Promise<any[]> {
        return loadCodingTasksFn(this.codingTaskCtx(), sessionId, sessionIds);
    }

    protected normalizeTodoStatus(status: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
        return normalizeTodoStatus(status);
    }
    protected async executeTurn(
        input: string,
        message?: AgentTurnMessageInput,
        profile?: string
    ): Promise<import('@tsdi/agent').AgentTurnResult | void> {
        if (this.appRpc) {
            await this.appRpc.request('run.turn', {
                sessionId: this.state.sessionId, input, workspace: this.workspace,
                ...(profile ? { profile } : {}),
                ...(message ? { message } : {})
            }, this.rpcRequestContext());
            return;
        }
        return this.runtime.runTurn(this.state.sessionId, input, undefined, message, profile, undefined, this.workspace);
    }

    protected async loadTools(sessionId = this.state.sessionId): Promise<any[]> {
        if (this.appRpc) {
            const tools = await this.appRpc.request('tools.list', { sessionId }, this.rpcRequestContext());
            return Array.isArray(tools) ? tools : [];
        }
        if (!this.toolRegistry) {
            return [];
        }
        return this.toolRegistry.getToolDefinitions(sessionId);
    }
}
