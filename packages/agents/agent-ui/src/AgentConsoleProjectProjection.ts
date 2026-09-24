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

export interface AgentConsoleProjectionState {
    sessions: any[];
    sessionId?: string;
    setProjects(projects: Array<Record<string, any>>): void;
    setThreads(threads: Array<Record<string, any>>): void;
}

export function resolveProjectSessionsFor(state: AgentConsoleProjectionState, sessionId = state.sessionId || ''): Array<Record<string, any>> {
    const sessions = state.sessions;
    const anchor = sessions.find(item => item.id === sessionId)
        || sessions.find(item => item.current)
        || sessions[0];
    if (!anchor) {
        return [];
    }
    const projectKey = resolveSessionProjectKey(anchor);
    if (projectKey) {
        return sessions.filter(item => resolveSessionProjectKey(item) === projectKey);
    }
    const workspace = String(anchor.workspace || '').trim();
    if (workspace) {
        const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
        return sessions.filter(item => normalizeAgentWorkspaceIdentity(item.workspace) === workspaceKey);
    }
    const primaryThreadId = String(anchor.primaryThreadId || '').trim();
    if (primaryThreadId) {
        return sessions.filter(item => String(item.primaryThreadId || '').trim() === primaryThreadId);
    }
    return [anchor];
}

export function resolveThreadKeyForSession(
    session?: {
        primaryThreadId?: string;
        originThreadId?: string;
        id?: string;
    } | null,
    sessions: Array<{
        id: string;
        primaryThreadId?: string;
        originThreadId?: string;
    }> = [],
    visited = new Set<string>()
): string {
    const primaryThreadId = String(session?.primaryThreadId || '').trim();
    if (primaryThreadId) {
        return `thread:${primaryThreadId}`;
    }
    const sessionId = String(session?.id || '').trim();
    if (visited.has(sessionId)) {
        return sessionId ? `session:${sessionId}` : '';
    }
    visited.add(sessionId);
    const originThreadId = String(session?.originThreadId || '').trim();
    if (originThreadId) {
        const originSession = sessions.find(item => String(item.id || '').trim() === originThreadId);
        if (originSession) {
            const originKey = resolveThreadKeyForSession(originSession, sessions, visited);
            if (originKey) {
                return originKey;
            }
        }
        return `thread:${originThreadId}`;
    }
    return sessionId ? `session:${sessionId}` : '';
}

export function resolveThreadSessionsFor(state: AgentConsoleProjectionState, sessionId = state.sessionId || ''): Array<Record<string, any>> {
    const sessions = state.sessions;
    const anchor = sessions.find(item => item.id === sessionId)
        || sessions.find(item => item.current)
        || sessions[0];
    if (!anchor) {
        return [];
    }
    const threadKey = resolveThreadKeyForSession(anchor, sessions);
    if (threadKey) {
        return sessions.filter(item => resolveThreadKeyForSession(item, sessions) === threadKey);
    }
    return [anchor];
}

export function resolveSessionThreadKey(session?: {
    primaryThreadId?: string;
    id?: string;
} | null): string {
    const primaryThreadId = String(session?.primaryThreadId || '').trim();
    if (primaryThreadId) {
        return primaryThreadId;
    }
    const sessionId = String(session?.id || '').trim();
    return sessionId ? `session:${sessionId}` : '';
}

export function refreshProjects(state: AgentConsoleProjectionState): void {
    const seen = new Map<string, {
        key: string;
        label: string;
        lastActive: number;
        count: number;
        representativeLastActive: number;
        representativeId: string;
    }>();
    for (const s of state.sessions) {
        const key = resolveSessionProjectKey(s);
        if (!key) continue;
        const sessionLastActive = s.updatedAt || 0;
        const sessionId = String(s.id || '');
        const sessionLabel = s.projectLabel || s.projectId || s.focusSummary || s.workspace || s.primaryThreadId || s.rootRequest || key;
        const existing = seen.get(key);
        if (existing) {
            existing.count += 1;
            if (sessionLastActive > existing.lastActive) {
                existing.lastActive = sessionLastActive;
            }
            if (sessionLastActive > existing.representativeLastActive
                || (sessionLastActive === existing.representativeLastActive
                    && (!existing.representativeId || sessionId.localeCompare(existing.representativeId) < 0))) {
                existing.label = sessionLabel;
                existing.representativeLastActive = sessionLastActive;
                existing.representativeId = sessionId;
            }
        } else {
            seen.set(key, {
                key,
                label: sessionLabel,
                lastActive: sessionLastActive,
                count: 1,
                representativeLastActive: sessionLastActive,
                representativeId: sessionId
            });
        }
    }
    state.setProjects(Array.from(seen.values()).map(p => ({
        key: p.key,
        label: p.label,
        sessionCount: p.count,
        lastActive: p.lastActive || undefined
    })));
}

export function refreshThreads(state: AgentConsoleProjectionState): void {
    const seen = new Map<string, {
        key: string;
        label: string;
        lastActive: number;
        count: number;
        representativeLastActive: number;
        representativeId: string;
        sections?: unknown;
    }>();
    for (const s of state.sessions) {
        const key = resolveSessionThreadKey(s);
        if (!key) continue;
        const sessionLastActive = s.updatedAt || 0;
        const sessionId = String(s.id || '');
        const sessionLabel = s.projectLabel || s.focusSummary || s.rootRequest || s.workspace || s.primaryThreadId || key;
        const sections = Array.isArray(s.sections) && s.sections.length > 0 ? s.sections : undefined;
        const existing = seen.get(key);
        if (existing) {
            existing.count += 1;
            if (sessionLastActive > existing.lastActive) {
                existing.lastActive = sessionLastActive;
            }
            if (sessionLastActive > existing.representativeLastActive
                || (sessionLastActive === existing.representativeLastActive
                    && (!existing.representativeId || sessionId.localeCompare(existing.representativeId) < 0))) {
                existing.label = sessionLabel;
                existing.representativeLastActive = sessionLastActive;
                existing.representativeId = sessionId;
                existing.sections = sections;
            }
        } else {
            seen.set(key, {
                key,
                label: sessionLabel,
                lastActive: sessionLastActive,
                count: 1,
                representativeLastActive: sessionLastActive,
                representativeId: sessionId,
                sections
            });
        }
    }
    state.setThreads(Array.from(seen.values()).map(p => ({
        key: p.key,
        label: p.label,
        sessionCount: p.count,
        lastActive: p.lastActive || undefined,
        sections: p.sections
    })));
}
