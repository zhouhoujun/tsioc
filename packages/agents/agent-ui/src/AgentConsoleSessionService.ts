import { Injectable, Inject, Optional } from '@tsdi/ioc';
import { AGENT_CONSOLE_APP_RPC, AgentConsoleAppRpc, AgentMessage, AgentRuntime, SessionStore } from '@tsdi/agent';

export interface AgentConsoleSessionChoice {
    id: string;
    current?: boolean;
    detail?: string;
    createdAt?: number;
    lastActiveAt?: number;
    messageCount?: number;
    summary?: string;
    workspace?: string;
    projectKey?: string;
    projectId?: string;
    primaryThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
}

export interface AgentConsoleSessionProjectGroup {
    projectKey?: string;
    projectId?: string;
    label?: string;
    workspace: string;
    primaryThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    sessionCount: number;
    lastActiveAt: number;
    sessions: AgentConsoleSessionChoice[];
}

@Injectable()
export class AgentConsoleSessionService {
    constructor(
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() private sessionStore?: SessionStore | null,
        @Optional() private runtime?: AgentRuntime | null
    ) {
    }

    async ensureSession(sessionId?: string, context?: any): Promise<AgentConsoleSessionChoice> {
        if (this.appRpc) {
            const created = await this.appRpc.request('session.create', sessionId ? { sessionId } : {}, context);
            return {
                id: created?.sessionId || sessionId || this.createSessionId(),
                createdAt: created?.createdAt,
                lastActiveAt: created?.updatedAt,
                workspace: created?.workspace
            };
        }
        const resolvedId = String(sessionId || '').trim() || this.createSessionId();
        if (this.sessionStore) {
            const state = await this.sessionStore.get(resolvedId);
            return this.toChoice(state.sessionId, state);
        }
        return { id: resolvedId };
    }

    async listSessions(currentSessionId?: string, context?: any): Promise<AgentConsoleSessionChoice[]> {
        if (this.appRpc) {
            const sessions = await this.appRpc.request('session.list', undefined, context);
            const items = Array.isArray(sessions)
                ? sessions.map(item => ({
                    id: String(item?.id || ''),
                    createdAt: item?.createdAt,
                    lastActiveAt: item?.lastActiveAt,
                    messageCount: item?.messageCount,
                    summary: item?.summary,
                    workspace: item?.workspace,
                    projectKey: item?.projectKey,
                    projectId: item?.projectId,
                    primaryThreadId: item?.primaryThreadId,
                    sessionRole: item?.sessionRole,
                    rootRequest: item?.rootRequest,
                    focusSummary: item?.focusSummary
                })).filter(item => !!item.id)
                : [];
            return this.withCurrent(this.sortSessionChoices(items), currentSessionId);
        }
        if (this.sessionStore) {
            const ids = await this.sessionStore.listSessionIds();
            const sessions = await Promise.all(ids.map(async id => this.toChoice(id, await this.sessionStore!.get(id))));
            return this.withCurrent(this.sortSessionChoices(sessions), currentSessionId);
        }
        return currentSessionId ? [{ id: currentSessionId, current: true }] : [];
    }

    async listProjectSessions(currentSessionId?: string, context?: any): Promise<AgentConsoleSessionProjectGroup[]> {
        if (this.appRpc) {
            const projects = await this.appRpc.request('session.list_projects', undefined, context);
            const groups = Array.isArray(projects)
                ? projects.map(project => ({
                    projectKey: String(project?.projectKey || '').trim() || undefined,
                    projectId: String(project?.projectId || '').trim() || undefined,
                    label: String(project?.label || '').trim() || undefined,
                    workspace: String(project?.workspace || '').trim(),
                    sessionCount: Number(project?.sessionCount || 0),
                    lastActiveAt: Number(project?.lastActiveAt || 0),
                    sessions: Array.isArray(project?.sessions)
                        ? this.sortSessionChoices(project.sessions.map((item: any) => ({
                            id: String(item?.id || ''),
                            createdAt: item?.createdAt,
                            lastActiveAt: item?.lastActiveAt,
                            messageCount: item?.messageCount,
                            summary: item?.summary,
                            workspace: item?.workspace,
                            projectId: item?.projectId,
                            primaryThreadId: item?.primaryThreadId,
                            sessionRole: item?.sessionRole,
                            rootRequest: item?.rootRequest,
                            focusSummary: item?.focusSummary
                        })).filter((item: AgentConsoleSessionChoice) => !!item.id))
                        : []
                }))
                : [];
            return this.withCurrentProjectSessions(this.sortProjectChoices(groups), currentSessionId);
        }
        if (this.sessionStore) {
            const projectIndexes = typeof (this.sessionStore as any).listProjects === 'function'
                ? await this.sessionStore.listProjects()
                : undefined;
            if (Array.isArray(projectIndexes) && projectIndexes.length > 0) {
                const sessions = await this.listSessions(currentSessionId, context);
                return this.withCurrentProjectSessions(this.groupProjectIndexes(projectIndexes, sessions), currentSessionId);
            }
            const sessions = await this.listSessions(currentSessionId, context);
            return this.withCurrentProjectSessions(this.groupProjectChoices(sessions), currentSessionId);
        }
        return [];
    }

    async loadMessages(sessionId: string, context?: any): Promise<AgentMessage[]> {
        if (this.appRpc) {
            const messages = await this.appRpc.request('session.messages', { sessionId }, context);
            return Array.isArray(messages) ? messages : [];
        }
        if (this.runtime) {
            return this.runtime.getMessages(sessionId);
        }
        if (this.sessionStore) {
            const state = await this.sessionStore.get(sessionId);
            return Array.isArray(state.messages) ? state.messages : [];
        }
        return [];
    }

    async deleteSession(sessionId: string, context?: any): Promise<void> {
        if (!sessionId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.delete', { sessionId }, context);
            return;
        }
        await this.sessionStore?.delete(sessionId);
    }

    protected withCurrent(
        sessions: AgentConsoleSessionChoice[],
        currentSessionId?: string
    ): AgentConsoleSessionChoice[] {
        const currentId = String(currentSessionId || '').trim();
        return sessions.map(item => ({
            ...item,
            current: !!currentId && item.id === currentId
        }));
    }

    protected toChoice(sessionId: string, state?: {
        createdAt?: number;
        updatedAt?: number;
        messages?: AgentMessage[];
        summary?: string;
        workspace?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        sessionRole?: string;
        rootRequest?: string;
        focusSummary?: string;
    }): AgentConsoleSessionChoice {
        return {
            id: sessionId,
            createdAt: state?.createdAt,
            lastActiveAt: state?.updatedAt ?? state?.createdAt,
            messageCount: state?.messages?.length || 0,
            summary: state?.summary,
            workspace: state?.workspace,
            projectKey: state?.projectKey,
            projectId: state?.projectId,
            primaryThreadId: state?.primaryThreadId,
            sessionRole: state?.sessionRole,
            rootRequest: state?.rootRequest,
            focusSummary: state?.focusSummary
        };
    }

    protected sortSessionChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionChoice[] {
        return sessions.slice().sort((left, right) => {
            const leftProjectKey = String(left.projectKey || '').trim();
            const rightProjectKey = String(right.projectKey || '').trim();
            if (!!leftProjectKey !== !!rightProjectKey) {
                return leftProjectKey ? -1 : 1;
            }
            if (leftProjectKey !== rightProjectKey) {
                return leftProjectKey.localeCompare(rightProjectKey);
            }
            const leftWorkspace = String(left.workspace || '').trim();
            const rightWorkspace = String(right.workspace || '').trim();
            if (leftWorkspace !== rightWorkspace) {
                return leftWorkspace.localeCompare(rightWorkspace);
            }
            const activityDelta = (right.lastActiveAt || 0) - (left.lastActiveAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return left.id.localeCompare(right.id);
        });
    }

    protected groupProjectChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionProjectGroup[] {
        const buckets = new Map<string, AgentConsoleSessionChoice[]>();
        for (const session of sessions) {
            const projectKey = this.resolveProjectChoiceKey(session);
            const bucket = buckets.get(projectKey) ?? [];
            bucket.push(session);
            buckets.set(projectKey, bucket);
        }
        return Array.from(buckets.entries())
            .map(([projectKey, groupedSessions]) => {
                const first = groupedSessions[0];
                const workspace = String(first?.workspace || '').trim();
                const projectId = String(first?.projectId || '').trim() || undefined;
                const primaryThreadId = String(first?.primaryThreadId || '').trim() || undefined;
                const sessionRole = String(first?.sessionRole || '').trim() || undefined;
                const rootRequest = String(first?.rootRequest || '').trim() || undefined;
                const focusSummary = String(first?.focusSummary || '').trim() || undefined;
                return {
                    projectKey,
                    projectId,
                    label: projectId || focusSummary || workspace || primaryThreadId || rootRequest || groupedSessions[0]?.id || 'session',
                    workspace,
                    primaryThreadId,
                    sessionRole,
                    rootRequest,
                    focusSummary,
                    sessions: this.sortSessionChoices(groupedSessions),
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

    protected resolveProjectChoiceKey(session: AgentConsoleSessionChoice): string {
        const projectId = String(session.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const primaryThreadId = String(session.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const workspace = String(session.workspace || '').trim();
        if (workspace) {
            return `workspace:${workspace}`;
        }
        return `session:${session.id}`;
    }

    protected groupProjectIndexes(
        projects: Array<{ projectKey: string; projectId?: string; workspace?: string; primaryThreadId?: string; sessionIds: string[]; lastActiveAt?: number }>,
        sessions: AgentConsoleSessionChoice[]
    ): AgentConsoleSessionProjectGroup[] {
        const sessionMap = new Map(sessions.map(session => [session.id, session]));
        return projects
            .map(project => {
                const groupedSessions = project.sessionIds
                    .map(sessionId => sessionMap.get(sessionId))
                    .filter((session): session is AgentConsoleSessionChoice => !!session);
                const workspace = String(project.workspace || '').trim();
                const projectId = String(project.projectId || '').trim() || undefined;
                const primaryThreadId = String(project.primaryThreadId || '').trim() || undefined;
                const focusSummary = String(groupedSessions[0]?.focusSummary || '').trim() || undefined;
                const rootRequest = String(groupedSessions[0]?.rootRequest || '').trim() || undefined;
                return {
                    projectKey: String(project.projectKey || '').trim() || undefined,
                    projectId,
                    label: projectId || focusSummary || workspace || primaryThreadId || rootRequest || groupedSessions[0]?.id || 'session',
                    workspace,
                    primaryThreadId,
                    rootRequest,
                    focusSummary,
                    sessions: this.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Number(project.lastActiveAt || Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0))
                };
            })
            .filter(group => group.sessionCount > 0)
            .sort((left, right) => this.compareProjectChoices(left, right));
    }

    protected withCurrentProjectSessions(
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

    protected sortProjectChoices(groups: AgentConsoleSessionProjectGroup[]): AgentConsoleSessionProjectGroup[] {
        return groups.slice().sort((left, right) => this.compareProjectChoices(left, right));
    }

    protected compareProjectChoices(left: AgentConsoleSessionProjectGroup, right: AgentConsoleSessionProjectGroup): number {
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

    protected createSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }
}
