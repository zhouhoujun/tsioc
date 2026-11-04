import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleSessionProjectGroup, AgentConsoleSessionService } from './AgentConsoleSessionService';

export interface AgentConsoleSessionRefreshHost {
    state: AgentConsoleSessionState;
    sessionService?: AgentConsoleSessionService | null;
    flattenProjectSessions(groups: AgentConsoleSessionProjectGroup[]): Array<{
        id: string;
        current: boolean;
        workspace?: string;
        updatedAt?: number;
        messageCount?: number;
        summary?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        rootRequest?: string;
        focusSummary?: string;
        projectLabel?: string;
        projectSessionCount?: number;
    }>;
    refreshProjectContext(): void;
    refreshProjects(): void;
    refreshThreads(): void;
    updateTerminalTitle(): void;
}

/** Refresh the session picker, preferring project-grouped sessions. */
export async function refreshSessionsView(
    host: AgentConsoleSessionRefreshHost,
    currentSessionId = host.state.sessionId
): Promise<void> {
    if (!host.sessionService) {
        return;
    }
    const groups = await host.sessionService.listProjectSessions(currentSessionId);
    if (currentSessionId !== host.state.sessionId) {
        return;
    }
    const groupedSessions = host.flattenProjectSessions(groups);
    if (groupedSessions.length) {
        host.state.setSessions(groupedSessions);
        host.refreshProjectContext();
        host.refreshProjects();
        host.refreshThreads();
        return;
    }
    const sessions = await host.sessionService.listSessions(currentSessionId);
    if (currentSessionId !== host.state.sessionId) {
        return;
    }
    if (!sessions.length) {
        host.state.setSessions([]);
        host.state.setProjects([]);
        host.state.setThreads([]);
        host.state.setProjectContext();
        host.updateTerminalTitle();
        return;
    }
    host.state.setSessions(sessions.map(item => ({
        id: item.id,
        current: !!item.current,
        workspace: item.workspace,
        updatedAt: item.lastActiveAt,
        messageCount: item.messageCount,
        summary: item.summary,
        title: item.title,
        pinned: !!item.pinned,
        archived: !!item.archived,
        projectKey: item.projectKey,
        projectId: item.projectId,
        primaryThreadId: item.primaryThreadId,
        originThreadId: item.originThreadId,
        sessionRole: item.sessionRole,
        rootRequest: item.rootRequest,
        focusSummary: item.focusSummary,
        projectLabel: item.projectId || item.focusSummary || item.workspace || item.primaryThreadId || item.rootRequest || item.id,
        sections: Array.isArray(item.sections) ? item.sections : undefined
    })));
    host.refreshProjectContext();
    host.refreshProjects();
    host.refreshThreads();
}
