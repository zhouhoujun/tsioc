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
}

export interface AgentConsoleSessionProjectGroup {
    workspace: string;
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
                    workspace: item?.workspace
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
                            workspace: item?.workspace
                        })).filter((item: AgentConsoleSessionChoice) => !!item.id))
                        : []
                }))
                : [];
            return this.withCurrentProjectSessions(this.sortProjectChoices(groups), currentSessionId);
        }
        if (this.sessionStore) {
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

    protected toChoice(sessionId: string, state?: { createdAt?: number; updatedAt?: number; messages?: AgentMessage[]; summary?: string; workspace?: string }): AgentConsoleSessionChoice {
        return {
            id: sessionId,
            createdAt: state?.createdAt,
            lastActiveAt: state?.updatedAt ?? state?.createdAt,
            messageCount: state?.messages?.length || 0,
            summary: state?.summary,
            workspace: state?.workspace
        };
    }

    protected sortSessionChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionChoice[] {
        return sessions.slice().sort((left, right) => {
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
            const workspace = String(session.workspace || '').trim();
            const bucket = buckets.get(workspace) ?? [];
            bucket.push(session);
            buckets.set(workspace, bucket);
        }
        return Array.from(buckets.entries())
            .map(([workspace, groupedSessions]) => ({
                workspace,
                sessions: this.sortSessionChoices(groupedSessions),
                sessionCount: groupedSessions.length,
                lastActiveAt: Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0)
            }))
            .sort((left, right) => {
                if (left.workspace !== right.workspace) {
                    return left.workspace.localeCompare(right.workspace);
                }
                const activityDelta = right.lastActiveAt - left.lastActiveAt;
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.workspace.localeCompare(right.workspace);
            });
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
        return groups.slice().sort((left, right) => {
            if (left.workspace !== right.workspace) {
                return left.workspace.localeCompare(right.workspace);
            }
            const activityDelta = right.lastActiveAt - left.lastActiveAt;
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return left.workspace.localeCompare(right.workspace);
        });
    }

    protected createSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }
}
