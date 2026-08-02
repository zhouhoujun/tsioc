import { Injectable, Inject, Optional } from '@tsdi/ioc';
import { AGENT_CONSOLE_APP_RPC, AgentConsoleAppRpc, AgentMessage, AgentRuntime, SessionSearchMatch, SessionStore } from '@tsdi/agent';

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
    originThreadId?: string;
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

export interface AgentConsoleSessionThreadGroup {
    threadId: string;
    projectId?: string;
    workspace: string;
    title?: string;
    rootRequest?: string;
    status?: string;
    stage?: string;
    originThreadId?: string;
    currentSessionId?: string;
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
                    originThreadId: item?.originThreadId,
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
                    primaryThreadId: String(project?.primaryThreadId || '').trim() || undefined,
                    sessionRole: String(project?.sessionRole || '').trim() || undefined,
                    rootRequest: String(project?.rootRequest || '').trim() || undefined,
                    focusSummary: String(project?.focusSummary || '').trim() || undefined,
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
                            originThreadId: item?.originThreadId,
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

    async listThreads(currentSessionId?: string, context?: any): Promise<AgentConsoleSessionThreadGroup[]> {
        if (this.appRpc) {
            const threads = await this.appRpc.request('session.list_threads', undefined, context);
            const groups = Array.isArray(threads)
                ? threads.map((thread: any) => ({
                    threadId: String(thread?.threadId || ''),
                    projectId: String(thread?.projectId || '').trim() || undefined,
                    workspace: String(thread?.workspace || '').trim(),
                    title: String(thread?.title || '').trim() || undefined,
                    rootRequest: String(thread?.rootRequest || '').trim() || undefined,
                    status: String(thread?.status || '').trim() || undefined,
                    stage: String(thread?.stage || '').trim() || undefined,
                    originThreadId: String(thread?.originThreadId || '').trim() || undefined,
                    currentSessionId: String(thread?.currentSessionId || '').trim() || undefined,
                    sessionCount: Number(thread?.sessionCount || 0),
                    lastActiveAt: Number(thread?.lastActiveAt || 0),
                    sessions: Array.isArray(thread?.sessions)
                        ? this.sortSessionChoices(thread.sessions.map((item: any) => ({
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
                        })).filter((item: AgentConsoleSessionChoice) => !!item.id))
                        : []
                }))
                : [];
            return this.withCurrentThreads(this.sortThreadChoices(groups), currentSessionId);
        }
        if (this.sessionStore) {
            const threadIndexes = typeof (this.sessionStore as any).listThreads === 'function'
                ? await this.sessionStore.listThreads()
                : undefined;
            const sessions = await this.listSessions(currentSessionId, context);
            if (Array.isArray(threadIndexes) && threadIndexes.length > 0) {
                return this.withCurrentThreads(this.groupThreadIndexes(threadIndexes, sessions), currentSessionId);
            }
            return this.withCurrentThreads(this.groupThreadChoices(sessions), currentSessionId);
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

    async searchSessions(query: string, context?: any): Promise<SessionSearchMatch[]> {
        if (this.appRpc) {
            const results = await this.appRpc.request('session.search', { query }, context);
            return Array.isArray(results) ? results : [];
        }
        if (this.runtime) {
            return this.runtime.searchSessions(query);
        }
        if (this.sessionStore) {
            return this.sessionStore.search(query);
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

    async cancelTurn(sessionId: string, context?: any): Promise<boolean> {
        if (!sessionId) {
            return false;
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('run.cancel', { sessionId }, context);
            return result?.cancelled === true;
        }
        if (this.runtime && typeof this.runtime.cancelTurn === 'function') {
            const result = await this.runtime.cancelTurn(sessionId);
            return result.cancelled === true;
        }
        return false;
    }

    async listApprovals(sessionId?: string, context?: any): Promise<Array<Record<string, any>>> {
        if (this.appRpc) {
            const result = await this.appRpc.request('approval.list', sessionId ? { sessionId } : {}, context);
            return Array.isArray(result?.requests) ? result.requests : [];
        }
        return [];
    }

    async decideApproval(decision: 'approve' | 'deny', requestId: string, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc || !requestId) {
            return null;
        }
        const result = await this.appRpc.request(
            decision === 'approve' ? 'approval.approve' : 'approval.reject',
            { requestId },
            context
        );
        return result ?? null;
    }

    async listSummaryQuality(options?: { provider?: string; limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.list', options ?? {}, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    async getSummaryQualityStats(provider?: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.stats', provider ? { provider } : {}, context);
        return Array.isArray(result?.aggregates) ? result.aggregates : [];
    }

    async getSummaryQualityTrend(options?: { provider?: string; limit?: number; bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.trend', options ?? {}, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    async listCompactionHistory(sessionId: string, options?: { level?: string; limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.list', { sessionId, ...options }, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    /**
     * Fetches per-session compaction aggregates over RPC. `sessionId` is
     * optional: when provided the result is scoped to that session (and the
     * caller must own it), otherwise all sessions are aggregated.
     */
    async getCompactionHistoryStats(sessionId?: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.stats', sessionId ? { sessionId } : {}, context);
        return Array.isArray(result?.aggregates) ? result.aggregates : [];
    }

    /**
     * Fetches time-bucketed compaction trends over RPC. `sessionId` is
     * optional: when provided the trend is scoped to that session (and the
     * caller must own it), otherwise every session gets its own trend line.
     */
    async getCompactionHistoryTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.trend', { ...(sessionId ? { sessionId } : {}), ...options }, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    /**
     * Fetches persisted turn diagnostics records over RPC. `sessionId` is
     * required and the caller must own the session.
     */
    async listTurnDiagnostics(sessionId: string, options?: { limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('turn_diagnostics.list', { sessionId, ...options }, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    /**
     * Fetches aggregated turn diagnostics over RPC. `sessionId` is optional:
     * when provided the aggregate is scoped to that session (and the caller
     * must own it), otherwise it covers every session owned by the principal.
     */
    async getTurnDiagnosticsStats(sessionId?: string, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('turn_diagnostics.stats', sessionId ? { sessionId } : {}, context);
        return result?.aggregate ?? null;
    }

    /**
     * Fetches time-bucketed turn diagnostics trends over RPC. `sessionId` is
     * optional: when provided the trend is scoped to that session (and the
     * caller must own it), otherwise every owned session gets its own trend
     * line.
     */
    async getTurnDiagnosticsTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('turn_diagnostics.trend', { ...(sessionId ? { sessionId } : {}), ...options }, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    /**
     * Fetches the delegation tree rooted at `sessionId` over RPC. The caller
     * must own the session. Returns the tree node view from the gateway.
     */
    async getDelegationTree(sessionId: string, options?: { status?: string | string[]; depth?: number }, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('delegation.tree', { sessionId, ...options }, context);
        return result?.tree ?? null;
    }

    /**
     * Fetches the delegation lineage (ancestors up to the root) for
     * `sessionId` over RPC. The caller must own the session.
     */
    async getDelegationLineage(sessionId: string, options?: { limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('delegation.lineage', { sessionId, ...options }, context);
        return Array.isArray(result?.lineage) ? result.lineage : [];
    }

    /**
     * Fetches the direct child delegation edges of `sessionId` over RPC. The
     * caller must own the session.
     */
    async getDelegationChildren(sessionId: string, options?: { status?: string | string[]; limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('delegation.children', { sessionId, ...options }, context);
        return Array.isArray(result?.children) ? result.children : [];
    }

    /**
     * Fetches flat delegation edges over RPC. `sessionId` is optional: when
     * provided only edges touching that session are returned (and the caller
     * must own it), otherwise every edge owned by the principal is listed.
     */
    async listDelegationEdges(options?: { sessionId?: string; limit?: number; offset?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('delegation.list', options ?? {}, context);
        return Array.isArray(result?.edges) ? result.edges : [];
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
        originThreadId?: string;
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
            originThreadId: state?.originThreadId,
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

    protected selectProjectRepresentative(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionChoice | undefined {
        return sessions.slice().sort((left, right) => {
            const activityDelta = (right.lastActiveAt || 0) - (left.lastActiveAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return left.id.localeCompare(right.id);
        })[0];
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
                const representative = this.selectProjectRepresentative(groupedSessions);
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
                const representative = this.selectProjectRepresentative(groupedSessions);
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

    protected resolveThreadChoiceKey(session: AgentConsoleSessionChoice): string {
        const primaryThreadId = String(session.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return primaryThreadId;
        }
        return `session:${session.id}`;
    }

    protected groupThreadChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionThreadGroup[] {
        const buckets = new Map<string, AgentConsoleSessionChoice[]>();
        for (const session of sessions) {
            const threadId = this.resolveThreadChoiceKey(session);
            const bucket = buckets.get(threadId) ?? [];
            bucket.push(session);
            buckets.set(threadId, bucket);
        }
        return Array.from(buckets.entries())
            .map(([threadId, groupedSessions]) => {
                const representative = this.selectProjectRepresentative(groupedSessions);
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
                    status: sessionRole === 'review' ? 'completed' : 'active',
                    stage: sessionRole === 'review' ? 'review'
                        : sessionRole === 'worker' ? 'implementation'
                        : sessionRole === 'branch' ? 'discovery' : undefined,
                    originThreadId: String(representative?.originThreadId || '').trim() || undefined,
                    currentSessionId: representative?.id,
                    sessions: this.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0)
                };
            })
            .sort((left, right) => this.compareThreadChoices(left, right));
    }

    protected groupThreadIndexes(
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
        }>,
        sessions: AgentConsoleSessionChoice[]
    ): AgentConsoleSessionThreadGroup[] {
        const sessionMap = new Map(sessions.map(session => [session.id, session]));
        return threads
            .map(thread => {
                const groupedSessions = thread.sessionIds
                    .map(sessionId => sessionMap.get(sessionId))
                    .filter((session): session is AgentConsoleSessionChoice => !!session);
                const representative = this.selectProjectRepresentative(groupedSessions);
                const workspace = String(thread.workspace || representative?.workspace || '').trim();
                const projectId = String(thread.projectId || '').trim() || undefined;
                const title = String(thread.title || representative?.focusSummary || representative?.rootRequest || '').trim() || undefined;
                const rootRequest = String(thread.rootRequest || representative?.rootRequest || '').trim() || undefined;
                const sessionRole = String(representative?.sessionRole || '').trim() || undefined;
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
                    sessions: this.sortSessionChoices(groupedSessions),
                    sessionCount: groupedSessions.length,
                    lastActiveAt: Number(thread.lastActiveAt || Math.max(...groupedSessions.map(item => item.lastActiveAt || 0), 0))
                };
            })
            .filter(group => group.sessionCount > 0)
            .sort((left, right) => this.compareThreadChoices(left, right));
    }

    protected withCurrentThreads(
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

    protected sortThreadChoices(groups: AgentConsoleSessionThreadGroup[]): AgentConsoleSessionThreadGroup[] {
        return groups.slice().sort((left, right) => this.compareThreadChoices(left, right));
    }

    protected compareThreadChoices(left: AgentConsoleSessionThreadGroup, right: AgentConsoleSessionThreadGroup): number {
        const activityDelta = right.lastActiveAt - left.lastActiveAt;
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return left.threadId.localeCompare(right.threadId);
    }

    protected createSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }
}
