import type { AgentConsoleSessionService, AgentConsoleSessionProjectGroup } from './AgentConsoleSessionService';
import {
    flattenProjectSessions,
    refreshCurrentSections,
    refreshProjects,
    refreshThreads,
    resolveCurrentProjectSessions,
    resolveProjectSessionsFor,
    resolveSessionProjectKey,
    resolveSessionThreadKey,
    resolveThreadKeyForSession,
    resolveThreadSessionsFor,
    selectProjectRepresentative
} from './AgentConsoleProjectProjection';
import { refreshProjectContext as refreshProjectContextView } from './AgentConsoleProjectProjection';
import {
    CodingTaskHandlerContext,
    captureTaskViewContext as captureTaskViewContextFn,
    isTaskViewContextCurrent as isTaskViewContextCurrentFn,
    resolveCodingTaskSessionId as resolveCodingTaskSessionIdFn,
    resolveFocusedCodingTask as resolveFocusedCodingTaskFn
} from './AgentConsoleCodingTaskHandlers';
import { refreshSessionsView } from './AgentConsoleSessionRefresh';
import { AgentConsolePanelVisibilityHost } from './AgentConsolePanelVisibility';

/** Project/session scope projections shared by the console facade. */
export abstract class AgentConsoleProjectHost extends AgentConsolePanelVisibilityHost {
    protected abstract sessionService?: AgentConsoleSessionService | null;
    protected abstract codingTaskCtx(): CodingTaskHandlerContext;
    protected abstract updateTerminalTitle(): void;

    protected async refreshSessions(currentSessionId = this.state.sessionId): Promise<void> {
        return refreshSessionsView({
            state: this.state,
            sessionService: this.sessionService,
            flattenProjectSessions: (groups: AgentConsoleSessionProjectGroup[]) => this.flattenProjectSessions(groups),
            refreshProjectContext: () => this.refreshProjectContext(),
            refreshProjects: () => this.refreshProjects(),
            refreshThreads: () => this.refreshThreads(),
            updateTerminalTitle: () => this.updateTerminalTitle()
        }, currentSessionId);
    }

    protected refreshThreads(): void {
        refreshThreads(this.state);
    }

    protected async refreshCurrentSections(): Promise<void> {
        return refreshCurrentSections(this.sessionService, this.state);
    }

    protected refreshProjects(): void {
        refreshProjects(this.state);
    }

    protected flattenProjectSessions(groups: AgentConsoleSessionProjectGroup[]) {
        return flattenProjectSessions(groups);
    }

    protected refreshProjectContext(): void {
        return refreshProjectContextView({
            state: this.state,
            updateTerminalTitle: () => this.updateTerminalTitle()
        });
    }

    protected resolveProjectSessionsFor(sessionId = this.state.sessionId) {
        return resolveProjectSessionsFor(this.state, sessionId) as any;
    }

    protected resolveCurrentProjectSessions() {
        return resolveCurrentProjectSessions(this.state) as any;
    }

    protected selectProjectRepresentative<T extends {
        id: string;
        updatedAt?: number;
    }>(sessions: T[]): T | undefined {
        return selectProjectRepresentative(sessions);
    }

    protected resolveSessionProjectKey(session?: {
        projectKey?: string;
        projectId?: string;
        workspace?: string;
        primaryThreadId?: string;
    } | null): string {
        return resolveSessionProjectKey(session);
    }

    protected resolveSessionThreadKey(session?: {
        primaryThreadId?: string;
        id?: string;
    } | null): string {
        return resolveSessionThreadKey(session);
    }

    protected resolveThreadKeyForSession(
        session?: {
            primaryThreadId?: string;
            originThreadId?: string;
            id?: string;
        } | null,
        sessions: Array<{
            id: string;
            primaryThreadId?: string;
            originThreadId?: string;
        }> = this.state.sessions,
        visited = new Set<string>()
    ): string {
        return resolveThreadKeyForSession(session, sessions, visited);
    }

    protected resolveProjectSessionIdsFor(sessionId = this.state.sessionId): string[] {
        const sessions = this.resolveProjectSessionsFor(sessionId);
        const ids = sessions.map((item: { id?: string }) => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [sessionId];
    }

    protected resolveThreadSessionsFor(sessionId = this.state.sessionId) {
        return resolveThreadSessionsFor(this.state, sessionId) as any;
    }

    protected resolveThreadSessionIdsFor(sessionId = this.state.sessionId): string[] {
        const sessions = this.resolveThreadSessionsFor(sessionId);
        const ids = sessions.map((item: { id?: string }) => String(item.id || '').trim()).filter(Boolean);
        return ids.length ? ids : [sessionId];
    }

    protected resolveCurrentProjectSessionIds(): string[] {
        return this.resolveProjectSessionIdsFor(this.state.sessionId);
    }

    protected resolveCodingTaskSessionId(task?: Record<string, any> | null): string {
        return resolveCodingTaskSessionIdFn(this.codingTaskCtx(), task);
    }

    protected captureTaskViewContext(): { sessionId: string; version: number } {
        return captureTaskViewContextFn(this.codingTaskCtx());
    }

    protected isTaskViewContextCurrent(context: { sessionId: string; version: number }): boolean {
        return isTaskViewContextCurrentFn(this.codingTaskCtx(), context);
    }

    protected resolveFocusedCodingTask(): Record<string, any> | null {
        return resolveFocusedCodingTaskFn(this.codingTaskCtx());
    }
}
