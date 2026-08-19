import { Injectable, Inject, Optional } from '@tsdi/ioc';
import { AGENT_CONSOLE_APP_RPC, AgentConsoleAppRpc, AgentMessage, AgentRuntime, AgentSessionSection, AgentSessionSectionInfo, TurnDiagnosticsStore, buildUsageSummary, collectMessageUsageRecords, collectTurnUsageRecords, deriveSectionInfos, normalizeAgentWorkspaceIdentity, SessionSearchMatch, SessionStore } from '@tsdi/agent';

export type AgentSessionExportFormat = 'json' | 'jsonl';

export interface AgentSessionExportOptions {
    format?: AgentSessionExportFormat;
}

export interface AgentSessionExportResult {
    sessionId: string;
    format: AgentSessionExportFormat;
    exportedAt: number;
    fileName: string;
    contentType: string;
    content: string;
    session: Record<string, any>;
    messages: AgentMessage[];
    toolCalls: Array<Record<string, any>>;
}

export interface AgentConsoleSessionChoice {
    id: string;
    current?: boolean;
    detail?: string;
    createdAt?: number;
    lastActiveAt?: number;
    messageCount?: number;
    summary?: string;
    title?: string;
    pinned?: boolean;
    archived?: boolean;
    workspace?: string;
    projectKey?: string;
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: string;
    rootRequest?: string;
    focusSummary?: string;
    threadStatus?: string;
    sections?: AgentSessionSectionInfo[];
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
    sections?: AgentSessionSectionInfo[];
    sessions: AgentConsoleSessionChoice[];
}

@Injectable()
export class AgentConsoleSessionService {
    constructor(
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) private appRpc?: AgentConsoleAppRpc | null,
        @Optional() private sessionStore?: SessionStore | null,
        @Optional() private runtime?: AgentRuntime | null,
        @Optional() private turnDiagnostics?: TurnDiagnosticsStore | null
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

    async listSessions(currentSessionId?: string, context?: any, options?: { includeArchived?: boolean }): Promise<AgentConsoleSessionChoice[]> {
        if (this.appRpc) {
            const sessions = await this.appRpc.request('session.list', options?.includeArchived ? { includeArchived: true } : undefined, context);
            const items = Array.isArray(sessions)
                ? sessions.map(item => ({
                    id: String(item?.id || ''),
                    createdAt: item?.createdAt,
                    lastActiveAt: item?.lastActiveAt,
                    messageCount: item?.messageCount,
                    summary: item?.summary,
                    title: item?.title,
                    pinned: !!item?.pinned,
                    archived: !!item?.archived,
                    workspace: item?.workspace,
                    projectKey: item?.projectKey,
                    projectId: item?.projectId,
                    primaryThreadId: item?.primaryThreadId,
                    originThreadId: item?.originThreadId,
                    sessionRole: item?.sessionRole,
                    rootRequest: item?.rootRequest,
                    focusSummary: item?.focusSummary,
                    threadStatus: item?.threadStatus,
                    sections: Array.isArray(item?.sections) ? item.sections : undefined
                })).filter(item => !!item.id)
                : [];
            return this.withCurrent(this.sortSessionChoices(items), currentSessionId);
        }
        if (this.sessionStore) {
            const ids = await this.sessionStore.listSessionIds();
            const sessions = await Promise.all(ids.map(async id => this.toChoice(id, await this.sessionStore!.get(id))));
            return this.withCurrent(this.sortSessionChoices(options?.includeArchived ? sessions : sessions.filter(item => !item.archived)), currentSessionId);
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
                            title: item?.title,
                            pinned: !!item?.pinned,
                            workspace: item?.workspace,
                            projectId: item?.projectId,
                            primaryThreadId: item?.primaryThreadId,
                            originThreadId: item?.originThreadId,
                            sessionRole: item?.sessionRole,
                            rootRequest: item?.rootRequest,
                            focusSummary: item?.focusSummary,
                            threadStatus: item?.threadStatus,
                            sections: Array.isArray(item?.sections) ? item.sections : undefined
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
                    sections: Array.isArray(thread?.sections) ? thread.sections : undefined,
                    sessions: Array.isArray(thread?.sessions)
                        ? this.sortSessionChoices(thread.sessions.map((item: any) => ({
                            id: String(item?.id || ''),
                            createdAt: item?.createdAt,
                            lastActiveAt: item?.lastActiveAt,
                            messageCount: item?.messageCount,
                            summary: item?.summary,
                            title: item?.title,
                            pinned: !!item?.pinned,
                            workspace: item?.workspace,
                            projectKey: item?.projectKey,
                            projectId: item?.projectId,
                            primaryThreadId: item?.primaryThreadId,
                            sessionRole: item?.sessionRole,
                            rootRequest: item?.rootRequest,
                            focusSummary: item?.focusSummary,
                            threadStatus: item?.threadStatus,
                            sections: Array.isArray(item?.sections) ? item.sections : undefined
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

    async loadMessagesPage(sessionId: string, context?: any, options?: { cursor?: string; before?: boolean; limit?: number; }): Promise<{ messages: AgentMessage[]; sections?: AgentSessionSection[]; nextCursor?: string; hasMore?: boolean; }> {
        if (this.appRpc) {
            const params: Record<string, any> = { sessionId };
            if (options?.cursor) {
                params.cursor = options.cursor;
            }
            if (options?.before) {
                params.before = true;
            }
            if (options?.limit != null) {
                params.limit = options.limit;
            }
            const page = await this.appRpc.request('session.messages', params, context);
            if (page && typeof page === 'object' && Array.isArray(page.messages)) {
                return {
                    messages: page.messages,
                    sections: Array.isArray(page.sections) ? page.sections : undefined,
                    nextCursor: page.nextCursor,
                    hasMore: !!page.hasMore
                };
            }
            return { messages: Array.isArray(page) ? page : [] };
        }
        if (this.runtime) {
            const messages = await this.runtime.getMessages(sessionId);
            const state = typeof (this.runtime as any).getSessionState === 'function'
                ? await (this.runtime as any).getSessionState(sessionId)
                : undefined;
            return {
                messages,
                sections: Array.isArray(state?.sections) ? state.sections : undefined
            };
        }
        if (this.sessionStore) {
            const state = await this.sessionStore.get(sessionId);
            return {
                messages: Array.isArray(state.messages) ? state.messages : [],
                sections: Array.isArray((state as any).sections) ? (state as any).sections : undefined
            };
        }
        return { messages: [] };
    }

    async loadMessages(sessionId: string, context?: any): Promise<AgentMessage[]> {
        const page = await this.loadMessagesPage(sessionId, context);
        return page.messages;
    }

    async listSections(sessionId: string, context?: any): Promise<AgentSessionSection[]> {
        if (this.appRpc) {
            const sections = await this.appRpc.request('session.section.list', { sessionId }, context);
            return Array.isArray(sections) ? sections : [];
        }
        if (this.sessionStore) {
            return this.sessionStore.listSections(sessionId);
        }
        return [];
    }

    async createSection(sessionId: string, label: string, context?: any, options?: { beforeId?: string; }): Promise<AgentSessionSection> {
        if (this.appRpc) {
            return await this.appRpc.request('session.section.create', {
                sessionId,
                label,
                ...(options?.beforeId ? { beforeId: options.beforeId } : {})
            }, context);
        }
        return this.sessionStore!.addSection(sessionId, label, options?.beforeId);
    }

    async renameSection(sessionId: string, sectionId: string, label: string, context?: any): Promise<void> {
        if (this.appRpc) {
            await this.appRpc.request('session.section.rename', { sessionId, sectionId, label }, context);
            return;
        }
        await this.sessionStore?.renameSection(sessionId, sectionId, label);
    }

    async moveSection(sessionId: string, sectionId: string, context?: any, options?: { beforeId?: string; }): Promise<void> {
        if (this.appRpc) {
            await this.appRpc.request('session.section.move', {
                sessionId,
                sectionId,
                ...(options?.beforeId ? { beforeId: options.beforeId } : {})
            }, context);
            return;
        }
        await this.sessionStore?.moveSection(sessionId, sectionId, options?.beforeId);
    }

    async deleteSection(sessionId: string, sectionId: string, context?: any): Promise<void> {
        if (this.appRpc) {
            await this.appRpc.request('session.section.delete', { sessionId, sectionId }, context);
            return;
        }
        await this.sessionStore?.deleteSection(sessionId, sectionId);
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

    async setSessionTitle(sessionId: string, title?: string, context?: any): Promise<void> {
        if (!sessionId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.set_title', { sessionId, title }, context);
            return;
        }
        await this.sessionStore?.setTitle(sessionId, title);
    }

    async setSessionPinned(sessionId: string, pinned: boolean, context?: any): Promise<void> {
        if (!sessionId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.set_pinned', { sessionId, pinned }, context);
            return;
        }
        await this.sessionStore?.setPinned(sessionId, pinned);
    }

    async setSessionArchived(sessionId: string, archived: boolean, context?: any): Promise<void> {
        if (!sessionId) return;
        if (this.appRpc) {
            await this.appRpc.request('session.set_archived', { sessionId, archived }, context);
            return;
        }
        await (this.sessionStore as any)?.setArchived(sessionId, archived);
    }

    async forkSession(sessionId: string, messageId?: string, forkSessionId?: string, context?: any): Promise<string> {
        if (!sessionId) return '';
        if (this.appRpc) {
            const result = await this.appRpc.request('session.fork', { sessionId, ...(messageId ? { messageId } : {}), ...(forkSessionId ? { forkSessionId } : {}) }, context);
            return String(result?.sessionId || '');
        }
        const state = await (this.sessionStore as any)?.fork(sessionId, messageId, forkSessionId);
        return String(state?.sessionId || '');
    }

    async createSessionSnapshot(sessionId: string, label?: string, context?: any): Promise<string> {
        if (!sessionId) {
            return '';
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.snapshot.create', { sessionId, label }, context);
            return String(result?.snapshotId || '');
        }
        return this.sessionStore?.snapshot(sessionId, label) ?? '';
    }

    async listSessionSnapshots(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!sessionId) {
            return [];
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.snapshot.list', { sessionId }, context);
            return Array.isArray(result) ? result : [];
        }
        return this.sessionStore?.listSnapshots(sessionId) ?? [];
    }

    async restoreSessionSnapshot(sessionId: string, snapshotId: string, context?: any): Promise<void> {
        if (!sessionId || !snapshotId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.snapshot.restore', { sessionId, snapshotId }, context);
            return;
        }
        await this.sessionStore?.restoreSnapshot(sessionId, snapshotId);
    }

    async deleteSessionSnapshot(sessionId: string, snapshotId: string, context?: any): Promise<void> {
        if (!sessionId || !snapshotId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.snapshot.delete', { sessionId, snapshotId }, context);
            return;
        }
        await this.sessionStore?.deleteSnapshot(sessionId, snapshotId);
    }

    async listGitStepSnapshots(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!sessionId) {
            return [];
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.list', { sessionId }, context);
            return Array.isArray(result) ? result : [];
        }
        if (this.runtime && typeof this.runtime.listGitStepSnapshots === 'function') {
            return this.runtime.listGitStepSnapshots(sessionId) ?? [];
        }
        return [];
    }

    async diffGitStepSnapshot(sessionId: string, ref: string, context?: any): Promise<Record<string, any> | null> {
        if (!sessionId || !ref) {
            return null;
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.diff', { sessionId, ref }, context);
            return result && typeof result === 'object' ? result : null;
        }
        if (this.runtime && typeof this.runtime.diffGitStepSnapshot === 'function') {
            return this.runtime.diffGitStepSnapshot(sessionId, ref) ?? null;
        }
        return null;
    }

    async revertGitStepSnapshot(sessionId: string, messageId: string, context?: any): Promise<Record<string, any>> {
        if (!sessionId || !messageId) {
            return { reverted: false, error: 'sessionId and messageId are required' };
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.revert', { sessionId, messageId }, context);
            return result && typeof result === 'object' ? result : { reverted: false };
        }
        if (this.runtime && typeof this.runtime.revertGitStepSnapshot === 'function') {
            return this.runtime.revertGitStepSnapshot(sessionId, messageId) ?? { reverted: false };
        }
        return { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    async unrevertGitStepSnapshot(sessionId: string, context?: any): Promise<Record<string, any>> {
        if (!sessionId) {
            return { reverted: false, error: 'sessionId is required' };
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.unrevert', { sessionId }, context);
            return result && typeof result === 'object' ? result : { reverted: false };
        }
        if (this.runtime && typeof this.runtime.unrevertGitStepSnapshot === 'function') {
            return this.runtime.unrevertGitStepSnapshot(sessionId) ?? { reverted: false };
        }
        return { reverted: false, error: 'git step snapshots not supported by this runtime' };
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

    /**
     * Force a context compaction for the session (backs the `/compact`
     * command). Prefers the gateway RPC when connected, falls back to the
     * local runtime's `compactNow` (e.g. in-process / TUI consumers).
     */
    async compactSession(sessionId: string, reason?: string, context?: any): Promise<Record<string, any>> {
        if (!sessionId) {
            return { sessionId: '', compacted: false, error: 'session-id-required' };
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.compact', { sessionId, reason }, context);
            return result && typeof result === 'object' ? result : { sessionId, compacted: false };
        }
        if (this.runtime && typeof this.runtime.compactNow === 'function') {
            const result = await this.runtime.compactNow(sessionId, reason);
            return result ?? { sessionId, compacted: false };
        }
        return { sessionId, compacted: false, error: 'compaction not supported by this runtime' };
    }

    async exportSession(
        sessionId: string,
        options?: AgentSessionExportOptions,
        context?: any
    ): Promise<AgentSessionExportResult> {
        const resolvedSessionId = String(sessionId || '').trim();
        if (!resolvedSessionId) {
            throw new Error('sessionId is required');
        }
        const format = this.normalizeExportFormat(options?.format);
        if (this.appRpc) {
            const result = await this.appRpc.request('session.export', { sessionId: resolvedSessionId, format }, context);
            return this.normalizeExportResult(resolvedSessionId, format, result);
        }
        const state = this.sessionStore
            ? await this.sessionStore.get(resolvedSessionId)
            : undefined;
        const messages = state?.messages
            ? state.messages.slice()
            : this.runtime
                ? await this.runtime.getMessages(resolvedSessionId)
                : [];
        const toolCalls = this.collectExportToolCalls(messages);
        const exportedAt = Date.now();
        const session = {
            id: resolvedSessionId,
            createdAt: state?.createdAt ?? null,
            updatedAt: state?.updatedAt ?? null,
            summary: state?.summary ?? null,
            workspace: state?.workspace ?? null,
            projectId: state?.projectId ?? null,
            primaryThreadId: state?.primaryThreadId ?? null,
            originThreadId: state?.originThreadId ?? null,
            sessionRole: state?.sessionRole ?? null,
            rootRequest: state?.rootRequest ?? null,
            focusSummary: state?.focusSummary ?? null,
            threadStatus: state?.threadStatus ?? null,
            messageCount: messages.length,
            toolCallCount: toolCalls.length
        };
        return this.createExportResult(resolvedSessionId, format, exportedAt, session, messages, toolCalls);
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
     * Runs a harness failure-pattern audit over RPC. `sessionId` is optional:
     * when provided the audit is scoped to that session (and the caller must
     * own it), otherwise it covers every session owned by the principal.
     */
    async runHarnessAudit(sessionId?: string, options?: { since?: number; topN?: number; failureRateThreshold?: number; minFailures?: number }, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('harness.audit', { ...(sessionId ? { sessionId } : {}), ...options }, context);
        return result?.report ?? null;
    }

    /**
     * Lists the builtin harness profiles plus the active reference.
     */
    async listHarnessProfiles(context?: any): Promise<{ profiles: any[]; current?: string }> {
        if (this.appRpc) {
            const result = await this.appRpc.request('harness.profile.list', {}, context);
            return result ?? { profiles: [] };
        }
        return { profiles: [] };
    }

    /**
     * Resolves the effective harness profile (builtin reference or live snapshot).
     */
    async currentHarnessProfile(context?: any): Promise<any | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('harness.profile.current', {}, context);
        return result?.profile ?? null;
    }

    /**
     * Diffs two harness profiles (builtin names or `current`).
     */
    async diffHarnessProfiles(from: string, to: string, context?: any): Promise<{ from?: string; to?: string; diff?: string[]; error?: string } | null> {
        if (!this.appRpc) {
            return null;
        }
        return this.appRpc.request('harness.profile.diff', { from, to }, context) ?? null;
    }

    async getUsageStats(sessionId?: string, optionsOrContext: { range?: 'daily' | 'weekly' | 'cumulative'; since?: number | string } | any = {}, context?: any): Promise<Record<string, any>> {
        const hasUsageOptions = optionsOrContext && typeof optionsOrContext === 'object'
            && (Object.prototype.hasOwnProperty.call(optionsOrContext, 'range') || Object.prototype.hasOwnProperty.call(optionsOrContext, 'since'));
        const options = (hasUsageOptions ? optionsOrContext : {}) as { range?: 'daily' | 'weekly' | 'cumulative'; since?: number | string };
        const requestContext = hasUsageOptions ? context : optionsOrContext;
        if (this.appRpc) {
            const result = await this.appRpc.request('usage.stats', { ...(sessionId ? { sessionId } : {}), ...options }, requestContext);
            return { ...(result?.usage ?? buildUsageSummary([])), ...(result?.range ? { selectedRange: result.range, selected: result.selected, since: result.since } : {}) };
        }
        const sessionIds = sessionId
            ? [sessionId]
            : this.sessionStore
                ? await this.sessionStore.listSessionIds()
                : [];
        const usageRecords: Array<ReturnType<typeof collectMessageUsageRecords>[number]> = [];
        for (const id of sessionIds) {
            const state = this.sessionStore
                ? await this.sessionStore.get(id)
                : undefined;
            const messages = state?.messages
                ?? (this.runtime && sessionIds.length === 1 ? await this.runtime.getMessages(id) : []);
            const since = options.since == null ? undefined : typeof options.since === 'number' ? options.since : Date.parse(options.since);
            usageRecords.push(...collectMessageUsageRecords(id, messages || []).filter(record => !since || record.createdAt >= since));
        }
        const since = options.since == null ? undefined : typeof options.since === 'number' ? options.since : Date.parse(options.since);
        const turnRecords = this.turnDiagnostics
            ? collectTurnUsageRecords((await this.turnDiagnostics.list()).filter(record => (!sessionId || record.sessionId === sessionId) && (!since || record.createdAt >= since)))
            : undefined;
        const usage = buildUsageSummary(usageRecords, turnRecords);
        return { ...usage, ...(options.range ? { selectedRange: options.range, selected: usage[options.range] } : {}) };
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

    async getVoiceStatus(sessionId?: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc) {
            return { available: false, active: false, bufferedBytes: 0 };
        }
        const result = await this.appRpc.request('audio.status', sessionId ? { sessionId } : {}, context);
        return result ?? { available: false, active: false, bufferedBytes: 0 };
    }

    async startVoiceSession(
        sessionId: string,
        options?: { format?: 'pcm16k' | 'wav' | 'webm' },
        context?: any
    ): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await this.appRpc.request('audio.start', { sessionId, ...options }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    async feedVoiceAudio(sessionId: string, chunk: Uint8Array, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        const base64 = this.encodeBase64(chunk);
        return (await this.appRpc.request('audio.feed', { sessionId, chunk: base64 }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    async endVoiceSession(sessionId: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await this.appRpc.request('audio.end', { sessionId }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    async cancelVoiceSession(sessionId: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await this.appRpc.request('audio.cancel', { sessionId }, context)) ?? { ok: false, error: 'no response from gateway' };
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
        title?: string;
        pinned?: boolean;
        archived?: boolean;
        workspace?: string;
        projectKey?: string;
        projectId?: string;
        primaryThreadId?: string;
        originThreadId?: string;
        sessionRole?: string;
        rootRequest?: string;
        focusSummary?: string;
        threadStatus?: string;
        sections?: AgentSessionSection[];
    }): AgentConsoleSessionChoice {
        return {
            id: sessionId,
            createdAt: state?.createdAt,
            lastActiveAt: state?.updatedAt ?? state?.createdAt,
            messageCount: state?.messages?.length || 0,
            summary: state?.summary,
            title: state?.title,
            pinned: !!state?.pinned,
            archived: !!state?.archived,
            workspace: state?.workspace,
            projectKey: state?.projectKey,
            projectId: state?.projectId,
            primaryThreadId: state?.primaryThreadId,
            originThreadId: state?.originThreadId,
            sessionRole: state?.sessionRole,
            rootRequest: state?.rootRequest,
            focusSummary: state?.focusSummary,
            threadStatus: state?.threadStatus,
            sections: Array.isArray(state?.sections)
                ? deriveSectionInfos(state.sections, state?.messages)
                : undefined
        };
    }

    protected normalizeExportFormat(format?: string): AgentSessionExportFormat {
        return String(format || '').trim().toLowerCase() === 'jsonl'
            ? 'jsonl'
            : 'json';
    }

    protected normalizeExportResult(
        sessionId: string,
        format: AgentSessionExportFormat,
        result: any
    ): AgentSessionExportResult {
        const exportedAt = Number(result?.exportedAt ?? Date.now());
        const messages = Array.isArray(result?.messages) ? result.messages : [];
        const toolCalls = Array.isArray(result?.toolCalls) ? result.toolCalls : this.collectExportToolCalls(messages);
        const session = result?.session && typeof result.session === 'object'
            ? result.session
            : {
                id: sessionId,
                messageCount: messages.length,
                toolCallCount: toolCalls.length
            };
        return {
            sessionId,
            format: this.normalizeExportFormat(result?.format ?? format),
            exportedAt,
            fileName: String(result?.fileName || this.buildExportFileName(sessionId, exportedAt, format)),
            contentType: String(result?.contentType || this.resolveExportContentType(format)),
            content: String(result?.content || this.serializeSessionExport(format, exportedAt, session, messages, toolCalls)),
            session,
            messages,
            toolCalls
        };
    }

    protected createExportResult(
        sessionId: string,
        format: AgentSessionExportFormat,
        exportedAt: number,
        session: Record<string, any>,
        messages: AgentMessage[],
        toolCalls: Array<Record<string, any>>
    ): AgentSessionExportResult {
        return {
            sessionId,
            format,
            exportedAt,
            fileName: this.buildExportFileName(sessionId, exportedAt, format),
            contentType: this.resolveExportContentType(format),
            content: this.serializeSessionExport(format, exportedAt, session, messages, toolCalls),
            session,
            messages,
            toolCalls
        };
    }

    protected buildExportFileName(
        sessionId: string,
        exportedAt: number,
        format: AgentSessionExportFormat
    ): string {
        const ext = format === 'jsonl' ? 'jsonl' : 'json';
        const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, '-');
        const safeSessionId = String(sessionId || 'session').replace(/[^a-zA-Z0-9._-]+/g, '-');
        return `agent-session-${safeSessionId}-${stamp}.${ext}`;
    }

    protected resolveExportContentType(format: AgentSessionExportFormat): string {
        return format === 'jsonl'
            ? 'application/x-ndjson; charset=utf-8'
            : 'application/json; charset=utf-8';
    }

    protected serializeSessionExport(
        format: AgentSessionExportFormat,
        exportedAt: number,
        session: Record<string, any>,
        messages: AgentMessage[],
        toolCalls: Array<Record<string, any>>
    ): string {
        if (format === 'jsonl') {
            const lines = [
                JSON.stringify({ type: 'session', exportedAt, session }),
                ...messages.map(message => JSON.stringify({ type: 'message', message })),
                ...toolCalls.map(toolCall => JSON.stringify({ type: 'tool_call', toolCall }))
            ];
            return `${lines.join('\n')}\n`;
        }
        return JSON.stringify({
            type: 'session_export',
            format,
            exportedAt,
            session,
            messages,
            toolCalls
        }, null, 2);
    }

    protected collectExportToolCalls(messages: AgentMessage[]): Array<Record<string, any>> {
        const records: Array<Record<string, any>> = [];
        for (const message of messages || []) {
            const toolCalls = Array.isArray(message?.metadata?.toolCalls)
                ? message.metadata.toolCalls
                : [];
            for (const toolCall of toolCalls) {
                if (!toolCall || typeof toolCall !== 'object') {
                    continue;
                }
                const id = typeof toolCall.id === 'string' ? toolCall.id : '';
                const name = typeof toolCall.name === 'string' ? toolCall.name : '';
                if (!id && !name) {
                    continue;
                }
                records.push({
                    id: id || null,
                    name: name || null,
                    input: toolCall.input ?? null,
                    messageId: message.id,
                    createdAt: message.createdAt
                });
            }
        }
        return records;
    }

    protected sortSessionChoices(sessions: AgentConsoleSessionChoice[]): AgentConsoleSessionChoice[] {
        return sessions.slice().sort((left, right) => {
            const pinnedDelta = Number(!!right.pinned) - Number(!!left.pinned);
            if (pinnedDelta !== 0) {
                return pinnedDelta;
            }
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
            const leftWorkspaceKey = normalizeAgentWorkspaceIdentity(leftWorkspace);
            const rightWorkspaceKey = normalizeAgentWorkspaceIdentity(rightWorkspace);
            if (leftWorkspaceKey !== rightWorkspaceKey) {
                return leftWorkspaceKey.localeCompare(rightWorkspaceKey);
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
        const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
        if (workspaceKey) {
            return `workspace:${workspaceKey}`;
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
                    status: representative?.threadStatus ?? (sessionRole === 'review' ? 'completed' : 'active'),
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
                const representative = this.selectProjectRepresentative(groupedSessions);
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

    protected encodeBase64(bytes: Uint8Array): string {
        const runtimeBuffer = (globalThis as { Buffer?: { from(value: Uint8Array): { toString(encoding: string): string } } }).Buffer;
        if (runtimeBuffer) return runtimeBuffer.from(bytes).toString('base64');
        if (typeof globalThis.btoa === 'function') {
            let binary = '';
            const chunkSize = 0x8000;
            for (let index = 0; index < bytes.length; index += chunkSize) {
                const slice = bytes.subarray(index, index + chunkSize);
                binary += String.fromCharCode(...Array.from(slice));
            }
            return globalThis.btoa(binary);
        }
        throw new Error('Base64 encoding is unavailable in this environment.');
    }
}
