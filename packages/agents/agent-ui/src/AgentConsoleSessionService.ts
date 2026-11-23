import { Injectable, Inject, Optional } from '@tsdi/ioc';
import { AGENT_CONSOLE_APP_RPC, AgentConsoleAppRpc, AgentMessage, AgentRuntime, AgentSessionSectionInfo, TurnDiagnosticsStore, buildUsageSummary, collectMessageUsageRecords, collectTurnUsageRecords, normalizeAgentWorkspaceIdentity, SessionSearchMatch, SessionStore } from '@tsdi/agent';
import {
    AgentConsoleSessionMessagePage,
    loadAgentConsoleAllMessages,
    loadAgentConsoleSessionMessagePage
} from './AgentConsoleSessionMessagePage';
import {
    AgentConsoleSessionFactsStore,
    agentConsoleSessionChoiceFrom,
    loadAgentConsoleSessionFacts,
    mapAgentConsoleSessionChoice
} from './AgentConsoleSessionChoiceProjection';
import { AgentConsoleSessionExportRpc } from './AgentConsoleSessionExportRpc';
import { AgentConsoleSessionGrouping } from './AgentConsoleSessionGrouping';
import { collectExportToolCalls, createExportResult, normalizeExportFormat, normalizeExportResult } from './AgentConsoleSessionExport';
import { formatAgentUiNotice } from './agent-ui.i18n';

export type AgentSessionExportFormat = 'json' | 'jsonl' | 'html';

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
export class AgentConsoleSessionService extends AgentConsoleSessionExportRpc {
    protected readonly sessionGrouping = new AgentConsoleSessionGrouping({
        selectProjectRepresentative: (sessions: import('./AgentConsoleSessionService').AgentConsoleSessionChoice[]) => this.selectProjectRepresentative(sessions),
        sortSessionChoices: (sessions: import('./AgentConsoleSessionService').AgentConsoleSessionChoice[]) => this.sortSessionChoices(sessions)
    });

    constructor(
        @Optional() @Inject(AGENT_CONSOLE_APP_RPC) protected appRpc?: AgentConsoleAppRpc | null,
        @Optional() protected sessionStore?: SessionStore | null,
        @Optional() protected runtime?: AgentRuntime | null,
        @Optional() protected turnDiagnostics?: TurnDiagnosticsStore | null
    ) {
        super();
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
            // Metadata only: creating/opening a tab must not deserialize the
            // transcript just to learn its workspace/archived flag.
            const facts = await loadAgentConsoleSessionFacts(this.sessionStore as AgentConsoleSessionFactsStore, [resolvedId]);
            const fact = facts?.get(resolvedId);
            if (fact) {
                return agentConsoleSessionChoiceFrom(resolvedId, fact);
            }
            const state = await this.sessionStore.get(resolvedId);
            return agentConsoleSessionChoiceFrom(state.sessionId, state);
        }
        return { id: resolvedId };
    }

    async listSessions(currentSessionId?: string, context?: any, options?: { includeArchived?: boolean }): Promise<AgentConsoleSessionChoice[]> {
        if (this.appRpc) {
            const sessions = await this.appRpc.request('session.list', options?.includeArchived ? { includeArchived: true } : undefined, context);
            const items = Array.isArray(sessions)
                ? sessions.map(item => mapAgentConsoleSessionChoice(item)).filter(item => !!item.id)
                : [];
            return this.withCurrent(this.sortSessionChoices(items), currentSessionId);
        }
        if (this.sessionStore) {
            const ids = await this.sessionStore.listSessionIds();
            const facts = await loadAgentConsoleSessionFacts(this.sessionStore as AgentConsoleSessionFactsStore, ids);
            const sessions = await Promise.all(ids.map(async id => {
                const fact = facts?.get(id);
                return fact
                    ? agentConsoleSessionChoiceFrom(id, fact)
                    : agentConsoleSessionChoiceFrom(id, await this.sessionStore!.get(id));
            }));
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
                        ? this.sortSessionChoices(project.sessions.map((item: any) => mapAgentConsoleSessionChoice(item)).filter((item: AgentConsoleSessionChoice) => !!item.id))
                        : []
                }))
                : [];
            return this.sessionGrouping.withCurrentProjectSessions(this.sessionGrouping.sortProjectChoices(groups), currentSessionId);
        }
        if (this.sessionStore) {
            const projectIndexes = await this.sessionStore?.listProjects();
            if (Array.isArray(projectIndexes) && projectIndexes.length > 0) {
                const sessions = await this.listSessions(currentSessionId, context);
                return this.sessionGrouping.withCurrentProjectSessions(this.sessionGrouping.groupProjectIndexes(projectIndexes, sessions), currentSessionId);
            }
            const sessions = await this.listSessions(currentSessionId, context);
            return this.sessionGrouping.withCurrentProjectSessions(this.sessionGrouping.groupProjectChoices(sessions), currentSessionId);
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
                        ? this.sortSessionChoices(thread.sessions.map((item: any) => mapAgentConsoleSessionChoice(item)).filter((item: AgentConsoleSessionChoice) => !!item.id))
                        : []
                }))
                : [];
            return this.sessionGrouping.withCurrentThreads(this.sessionGrouping.sortThreadChoices(groups), currentSessionId);
        }
        if (this.sessionStore) {
            const threadIndexes = await this.sessionStore?.listThreads();
            const sessions = await this.listSessions(currentSessionId, context);
            if (Array.isArray(threadIndexes) && threadIndexes.length > 0) {
                return this.sessionGrouping.withCurrentThreads(this.sessionGrouping.groupThreadIndexes(threadIndexes, sessions), currentSessionId);
            }
            return this.sessionGrouping.withCurrentThreads(this.sessionGrouping.groupThreadChoices(sessions), currentSessionId);
        }
        return [];
    }

    loadMessagesPage(sessionId: string, context?: any, options?: { cursor?: string; before?: boolean; limit?: number; }): Promise<AgentConsoleSessionMessagePage> {
        return loadAgentConsoleSessionMessagePage({ appRpc: this.appRpc, sessionStore: this.sessionStore, runtime: this.runtime }, sessionId, context, options);
    }

    loadMessages(sessionId: string, context?: any): Promise<AgentMessage[]> {
        return loadAgentConsoleAllMessages({ appRpc: this.appRpc, sessionStore: this.sessionStore, runtime: this.runtime }, sessionId, context);
    }

    async loadInbox(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (this.appRpc) {
            const result = await this.appRpc.request('session.inbox.get', { sessionId }, context).catch(() => null);
            return Array.isArray(result?.items) ? result.items : [];
        }
        if (this.runtime?.getSessionInbox) {
            return await this.runtime.getSessionInbox(sessionId);
        }
        return this.sessionStore?.listInbox ? await this.sessionStore.listInbox(sessionId) : [];
    }

    async replaceInbox(sessionId: string, items: Array<Record<string, any>>, context?: any): Promise<void> {
        if (this.appRpc) {
            await this.appRpc.request('session.inbox.replace', { sessionId, items }, context).catch(() => undefined);
            return;
        }
        if (this.runtime?.replaceSessionInbox) {
            await this.runtime.replaceSessionInbox(sessionId, items as any);
            return;
        }
        await this.sessionStore?.replaceInbox?.(sessionId, items as any);
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

    protected normalizeExportResult(sessionId: string, format: AgentSessionExportFormat, result: any): AgentSessionExportResult {
        return normalizeExportResult(sessionId, format, result);
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

    protected createSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }


}
