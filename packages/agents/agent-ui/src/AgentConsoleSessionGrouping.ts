import type {
    AgentConsoleSessionChoice,
    AgentConsoleSessionProjectGroup,
    AgentConsoleSessionThreadGroup
} from './AgentConsoleSessionService';
import type { AgentSessionSectionInfo } from '@tsdi/agent';
import { normalizeAgentWorkspaceIdentity } from '@tsdi/agent';

export interface AgentConsoleSessionGroupingHost {
    selectProjectRepresentative(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionChoice | undefined;
    sortSessionChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionChoice[];
}

/** Project/thread grouping for session pickers. */
export class AgentConsoleSessionGrouping {
    constructor(private host: AgentConsoleSessionGroupingHost) {}

    groupProjectChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionProjectGroup[] {
        const buckets = new Map<string, AgentConsoleSessionChoice[]>();
        for (const session of sessions) {
            const projectKey = this.resolveProjectChoiceKey(session);
            const bucket = buckets.get(projectKey) ?? [];
            bucket.push(session);
            buckets.set(projectKey, bucket);
        }
        return Array.from(buckets.entries())
            .map(([projectKey, groupedSessions]) => {
                const representative = this.host.selectProjectRepresentative(groupedSessions);
                const workspace = String(representative?.workspace || '').trim();
                const projectId = String(representative?.projectId || '').trim() || undefined;
                const primaryThreadId = String(representative?.primaryThreadId || '').trim() || undefined;
                const sessionRole = String(representative?.sessionRole || '').trim() || undefined;
                const rootRequest = String(representative?.rootRequest || '').trim() || undefined;
                const focusSummary = String(representative?.focusSummary || '').trim() || undefined;
                return {
                    projectKey,
                    projectId,
                    label: projectId || focusSummary || workspace || primaryThreadId || rootRequest || representative?.id || 'session',
                    workspace,
                    primaryThreadId,
                    sessionRole,
                    rootRequest,
                    focusSummary,
                    sessions: this.host.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0)
                };
            })
            .sort((left, right) => {
                const leftLabel = String(left.label || left.projectId || left.workspace || '').trim();
                const rightLabel = String(right.label || right.projectId || right.workspace || '').trim();
                if (leftLabel !== rightLabel) {
                    return leftLabel.localeCompare(rightLabel);
                }
                const leftProjectKey = String(left.projectKey || '').trim();
                const rightProjectKey = String(right.projectKey || '').trim();
                if (leftProjectKey !== rightProjectKey) {
                    return leftProjectKey.localeCompare(rightProjectKey);
                }
                const activityDelta = right.lastActiveAt - left.lastActiveAt;
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.workspace.localeCompare(right.workspace);
            });
    }

    resolveProjectChoiceKey(session: AgentConsoleSessionChoice): string {
        const projectId = String(session.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const primaryThreadId = String(session.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const workspace = String(session.workspace || '').trim();
        const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
        if (workspaceKey) {
            return `workspace:${workspaceKey}`;
        }
        return `session:${session.id}`;
    }

    groupProjectIndexes(
        projects: Array<{
            projectKey: string;
            projectId?: string;
            workspace?: string;
            primaryThreadId?: string;
            sessionRole?: string;
            rootRequest?: string;
            focusSummary?: string;
            sessionIds: string[];
            lastActiveAt?: number;
        }>,
        sessions: AgentConsoleSessionChoice[]
    ): AgentConsoleSessionProjectGroup[] {
        const sessionMap = new Map(sessions.map(session => [session.id, session]));
        return projects
            .map(project => {
                const groupedSessions = project.sessionIds
                    .map(sessionId => sessionMap.get(sessionId))
                    .filter((session): session is AgentConsoleSessionChoice => !!session);
                const representative = this.host.selectProjectRepresentative(groupedSessions);
                const workspace = String(project.workspace || '').trim();
                const projectId = String(project.projectId || '').trim() || undefined;
                const primaryThreadId = String(project.primaryThreadId || '').trim() || undefined;
                const sessionRole = String(representative?.sessionRole || project.sessionRole || '').trim() || undefined;
                const focusSummary = String(representative?.focusSummary || project.focusSummary || '').trim() || undefined;
                const rootRequest = String(representative?.rootRequest || project.rootRequest || '').trim() || undefined;
                return {
                    projectKey: String(project.projectKey || '').trim() || undefined,
                    projectId,
                    label: projectId || focusSummary || workspace || primaryThreadId || rootRequest || representative?.id || 'session',
                    workspace,
                    primaryThreadId,
                    sessionRole,
                    rootRequest,
                    focusSummary,
                    sessions: this.host.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Number(project.lastActiveAt || Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0))
                };
            })
            .filter(group => group.sessionCount > 0)
            .sort((left, right) => this.compareProjectChoices(left, right));
    }

    withCurrentProjectSessions(
        groups: AgentConsoleSessionProjectGroup[],
        currentSessionId?: string
    ): AgentConsoleSessionProjectGroup[] {
        const currentId = String(currentSessionId || '').trim();
        return groups.map(group => ({
            ...group,
            sessions: group.sessions.map(session => ({
                ...session,
                current: !!currentId && session.id === currentId
            }))
        }));
    }

    sortProjectChoices(groups: AgentConsoleSessionProjectGroup[]): AgentConsoleSessionProjectGroup[] {
        return groups.slice().sort((left, right) => this.compareProjectChoices(left, right));
    }

    compareProjectChoices(left: AgentConsoleSessionProjectGroup, right: AgentConsoleSessionProjectGroup): number {
        const leftProjectId = String(left.projectId || '').trim();
        const rightProjectId = String(right.projectId || '').trim();
        if (!!leftProjectId !== !!rightProjectId) {
            return leftProjectId ? -1 : 1;
        }
        const leftLabel = String(left.label || left.projectId || left.workspace || '').trim();
        const rightLabel = String(right.label || right.projectId || right.workspace || '').trim();
        if (leftLabel !== rightLabel) {
            return leftLabel.localeCompare(rightLabel);
        }
        const activityDelta = right.lastActiveAt - left.lastActiveAt;
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return String(left.projectKey || '').localeCompare(String(right.projectKey || ''));
    }

    resolveThreadChoiceKey(session: AgentConsoleSessionChoice): string {
        const primaryThreadId = String(session.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return primaryThreadId;
        }
        return `session:${session.id}`;
    }

    groupThreadChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionThreadGroup[] {
        const buckets = new Map<string, AgentConsoleSessionChoice[]>();
        for (const session of sessions) {
            const threadId = this.resolveThreadChoiceKey(session);
            const bucket = buckets.get(threadId) ?? [];
            bucket.push(session);
            buckets.set(threadId, bucket);
        }
        return Array.from(buckets.entries())
            .map(([threadId, groupedSessions]) => {
                const representative = this.host.selectProjectRepresentative(groupedSessions);
                const workspace = String(representative?.workspace || '').trim();
                const projectId = String(representative?.projectId || '').trim() || undefined;
                const title = String(representative?.focusSummary || representative?.rootRequest || '').trim() || undefined;
                const rootRequest = String(representative?.rootRequest || '').trim() || undefined;
                const sessionRole = String(representative?.sessionRole || '').trim() || undefined;
                return {
                    threadId,
                    projectId,
                    workspace,
                    title,
                    rootRequest,
                    status: representative?.threadStatus ?? (sessionRole === 'review' ? 'completed' : 'active'),
                    stage: sessionRole === 'review' ? 'review'
                        : sessionRole === 'worker' ? 'implementation'
                        : sessionRole === 'branch' ? 'discovery' : undefined,
                    originThreadId: String(representative?.originThreadId || '').trim() || undefined,
                    currentSessionId: representative?.id,
                    sessions: this.host.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0)
                };
            })
            .sort((left, right) => this.compareThreadChoices(left, right));
    }

    groupThreadIndexes(
        threads: Array<{
            threadId: string;
            projectId?: string;
            workspace?: string;
            title?: string;
            rootRequest?: string;
            status?: string;
            stage?: string;
            originThreadId?: string;
            currentSessionId?: string;
            sessionIds: string[];
            lastActiveAt?: number;
            sections?: AgentSessionSectionInfo[];
        }>,
        sessions: AgentConsoleSessionChoice[]
    ): AgentConsoleSessionThreadGroup[] {
        const sessionMap = new Map(sessions.map(session => [session.id, session]));
        return threads
            .map(thread => {
                const groupedSessions = thread.sessionIds
                    .map(sessionId => sessionMap.get(sessionId))
                    .filter((session): session is AgentConsoleSessionChoice => !!session);
                const representative = this.host.selectProjectRepresentative(groupedSessions);
                const workspace = String(thread.workspace || representative?.workspace || '').trim();
                const projectId = String(thread.projectId || '').trim() || undefined;
                const title = String(thread.title || representative?.focusSummary || representative?.rootRequest || '').trim() || undefined;
                const rootRequest = String(thread.rootRequest || representative?.rootRequest || '').trim() || undefined;
                const sessionRole = String(representative?.sessionRole || '').trim() || undefined;
                const threadSections = Array.isArray(thread.sections) && thread.sections.length > 0
                    ? thread.sections
                    : representative?.sections;
                return {
                    threadId: String(thread.threadId || '').trim(),
                    projectId,
                    workspace,
                    title,
                    rootRequest,
                    status: String(thread.status || (sessionRole === 'review' ? 'completed' : 'active') || '').trim() || undefined,
                    stage: String(thread.stage || '').trim() || undefined,
                    originThreadId: String(thread.originThreadId || representative?.originThreadId || '').trim() || undefined,
                    currentSessionId: String(thread.currentSessionId || representative?.id || '').trim() || undefined,
                    sections: threadSections,
                    sessions: this.host.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Number(thread.lastActiveAt || Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0))
                };
            })
            .filter(group => group.sessionCount > 0)
            .sort((left, right) => this.compareThreadChoices(left, right));
    }

    withCurrentThreads(
        groups: AgentConsoleSessionThreadGroup[],
        currentSessionId?: string
    ): AgentConsoleSessionThreadGroup[] {
        const currentId = String(currentSessionId || '').trim();
        return groups.map(group => ({
            ...group,
            sessions: group.sessions.map(session => ({
                ...session,
                current: !!currentId && session.id === currentId
            }))
        }));
    }

    sortThreadChoices(groups: AgentConsoleSessionThreadGroup[]): AgentConsoleSessionThreadGroup[] {
        return groups.slice().sort((left, right) => this.compareThreadChoices(left, right));
    }

    compareThreadChoices(left: AgentConsoleSessionThreadGroup, right: AgentConsoleSessionThreadGroup): number {
        const activityDelta = right.lastActiveAt - left.lastActiveAt;
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return left.threadId.localeCompare(right.threadId);
    }

}
