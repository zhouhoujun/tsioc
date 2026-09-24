import { normalizeAgentWorkspaceIdentity } from '@tsdi/agent';
import { AgentConsoleSessionProjectGroup } from './AgentConsoleSessionService';

export function resolveSessionProjectKey(session?: {
    projectKey?: string;
    projectId?: string;
    workspace?: string;
    primaryThreadId?: string;
} | null): string {
    const projectKey = String(session?.projectKey || '').trim();
    if (projectKey) {
        return projectKey;
    }
    const projectId = String(session?.projectId || '').trim();
    if (projectId) {
        return `project:${projectId}`;
    }
    const primaryThreadId = String(session?.primaryThreadId || '').trim();
    if (primaryThreadId) {
        return `thread:${primaryThreadId}`;
    }
    const workspace = String(session?.workspace || '').trim();
    const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
    if (workspaceKey) {
        return `workspace:${workspaceKey}`;
    }
    return '';
}

export function flattenProjectSessions(groups: AgentConsoleSessionProjectGroup[]): Array<{
    id: string;
    current: boolean;
    workspace?: string;
    updatedAt?: number;
    messageCount?: number;
    summary?: string;
    title?: string;
    pinned?: boolean;
    projectKey?: string;
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    rootRequest?: string;
    focusSummary?: string;
    projectLabel?: string;
    projectSessionCount?: number;
}> {
    return groups.flatMap(group => {
        const projectKey = String(group.projectKey || '').trim() || undefined;
        const projectId = String(group.projectId || '').trim() || undefined;
        const projectLabel = String(group.label || group.projectId || group.focusSummary || group.workspace || group.primaryThreadId || group.rootRequest || '').trim()
            || undefined;
        const primaryThreadId = String(group.primaryThreadId || '').trim() || undefined;
        const rootRequest = String(group.rootRequest || '').trim() || undefined;
        const focusSummary = String(group.focusSummary || '').trim() || undefined;
        return group.sessions.map(item => ({
            id: item.id,
            current: !!item.current,
            workspace: item.workspace || group.workspace,
            updatedAt: item.lastActiveAt,
            messageCount: item.messageCount,
            summary: item.summary,
            title: item.title,
            pinned: !!item.pinned,
            projectKey,
            projectId,
            primaryThreadId: item.primaryThreadId || primaryThreadId,
            originThreadId: String(item.originThreadId || '').trim() || undefined,
            rootRequest: item.rootRequest || rootRequest,
            focusSummary: item.focusSummary || focusSummary,
            projectLabel,
            projectSessionCount: group.sessionCount
        }));
    });
}

export function selectProjectRepresentative<T extends {
    id: string;
    updatedAt?: number;
}>(sessions: T[]): T | undefined {
    return sessions
        .slice()
        .sort((left, right) => {
            const activityDelta = (right.updatedAt || 0) - (left.updatedAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return String(left.id || '').localeCompare(String(right.id || ''));
        })[0];
}
