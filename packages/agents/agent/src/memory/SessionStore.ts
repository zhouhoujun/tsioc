import { Abstract } from '@tsdi/ioc';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentState } from '../runtime/AgentState';

export type AgentSessionRole = 'main' | 'branch' | 'review' | 'worker' | string;

export type AgentThreadStatus = 'active' | 'blocked' | 'completed' | 'abandoned' | string;

export type AgentThreadStage = 'discovery' | 'implementation' | 'review' | 'rollback' | string;

export interface AgentSessionProjectMetadata {
    projectId?: string;
    primaryThreadId?: string;
    originThreadId?: string;
    sessionRole?: AgentSessionRole;
    rootRequest?: string;
    focusSummary?: string;
}

export interface AgentSessionProjectIndex {
    projectKey: string;
    projectId?: string;
    workspace?: string;
    primaryThreadId?: string;
    sessionRole?: AgentSessionRole;
    rootRequest?: string;
    focusSummary?: string;
    sessionIds: string[];
    lastActiveAt?: number;
}

export interface AgentThreadIndex {
    threadId: string;
    projectId?: string;
    workspace?: string;
    title?: string;
    rootRequest?: string;
    status: AgentThreadStatus;
    stage?: AgentThreadStage;
    originThreadId?: string;
    currentSessionId?: string;
    sessionIds: string[];
    createdAt?: number;
    updatedAt?: number;
    lastActiveAt?: number;
}

export interface SessionSearchMatch {
    sessionId: string;
    count: number;
    snippet: string;
    updatedAt?: number;
    summary?: string;
    workspace?: string;
}

export interface SessionSearchOptions {
    limit?: number;
    maxSessions?: number;
}

export interface AgentThreadSource {
    sessionId: string;
    projectId?: string | null;
    workspace?: string | null;
    primaryThreadId?: string | null;
    originThreadId?: string | null;
    sessionRole?: AgentSessionRole | null;
    rootRequest?: string | null;
    focusSummary?: string | null;
    createdAt?: number | null;
    updatedAt?: number | null;
}

export function deriveThreadIndexes(inputs: AgentThreadSource[]): AgentThreadIndex[] {
    const buckets = new Map<string, AgentThreadIndex & {
        representativeLastActiveAt: number;
        representativeSessionId: string;
        sessionEntries: Array<{ id: string; lastActiveAt: number }>;
    }>();
    for (const input of inputs) {
        const threadId = String(input.primaryThreadId || '').trim() || `session:${input.sessionId}`;
        const lastActiveAt = Number(input.updatedAt || input.createdAt || 0);
        const existing = buckets.get(threadId) ?? {
            threadId,
            projectId: undefined,
            workspace: undefined,
            title: undefined,
            rootRequest: undefined,
            status: 'active',
            stage: undefined,
            originThreadId: undefined,
            currentSessionId: undefined,
            sessionIds: [],
            createdAt: Number.MAX_SAFE_INTEGER,
            updatedAt: 0,
            lastActiveAt: 0,
            representativeLastActiveAt: -1,
            representativeSessionId: '',
            sessionEntries: []
        };
        existing.sessionIds.push(input.sessionId);
        existing.sessionEntries.push({ id: input.sessionId, lastActiveAt });
        existing.createdAt = Math.min(existing.createdAt ?? Number.MAX_SAFE_INTEGER, Number(input.createdAt || 0) || Number.MAX_SAFE_INTEGER);
        existing.updatedAt = Math.max(existing.updatedAt || 0, lastActiveAt);
        existing.lastActiveAt = Math.max(existing.lastActiveAt || 0, lastActiveAt);
        if (lastActiveAt > existing.representativeLastActiveAt
            || (lastActiveAt === existing.representativeLastActiveAt
                && (!existing.representativeSessionId || input.sessionId.localeCompare(existing.representativeSessionId) < 0))) {
            existing.projectId = input.projectId ?? undefined;
            existing.workspace = input.workspace ?? undefined;
            existing.title = input.focusSummary ?? input.rootRequest ?? undefined;
            existing.rootRequest = input.rootRequest ?? undefined;
            existing.originThreadId = input.originThreadId ?? undefined;
            existing.currentSessionId = input.sessionId;
            const role = String(input.sessionRole || '').trim() || undefined;
            existing.status = role === 'review' ? 'completed' : 'active';
            existing.stage = role === 'review' ? 'review'
                : role === 'worker' ? 'implementation'
                : role === 'branch' ? 'discovery' : undefined;
            existing.representativeLastActiveAt = lastActiveAt;
            existing.representativeSessionId = input.sessionId;
        }
        buckets.set(threadId, existing);
    }
    return Array.from(buckets.values()).map(({
        representativeLastActiveAt: _representativeLastActiveAt,
        representativeSessionId: _representativeSessionId,
        sessionEntries,
        ...thread
    }) => ({
        ...thread,
        createdAt: thread.createdAt === Number.MAX_SAFE_INTEGER ? undefined : thread.createdAt,
        sessionIds: sessionEntries
            .slice()
            .sort((left, right) => {
                const activityDelta = right.lastActiveAt - left.lastActiveAt;
                if (activityDelta !== 0) {
                    return activityDelta;
                }
                return left.id.localeCompare(right.id);
            })
            .map(entry => entry.id)
    })).sort((left, right) => {
        const activityDelta = (right.lastActiveAt || 0) - (left.lastActiveAt || 0);
        if (activityDelta !== 0) {
            return activityDelta;
        }
        return left.threadId.localeCompare(right.threadId);
    });
}

@Abstract()
export abstract class SessionStore {
    abstract get(sessionId: string): Promise<AgentState>;
    abstract has(sessionId: string): Promise<boolean>;
    abstract listSessionIds(): Promise<string[]>;
    abstract listProjects(): Promise<AgentSessionProjectIndex[]>;
    abstract listThreads(): Promise<AgentThreadIndex[]>;
    abstract append(sessionId: string, message: AgentMessage): Promise<AgentState>;
    abstract setSummary(sessionId: string, summary: string): Promise<void>;
    abstract setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void>;
    abstract setWorkspace(sessionId: string, workspace?: string): Promise<void>;
    abstract setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void>;
    abstract delete(sessionId: string): void | Promise<void>;
    abstract clear(): void | Promise<void>;

    async search(query: string, options: SessionSearchOptions = {}): Promise<SessionSearchMatch[]> {
        const normalizedQuery = String(query || '').toLowerCase().trim();
        if (!normalizedQuery) {
            return [];
        }
        const maxSessions = options.maxSessions ?? 200;
        const limit = options.limit ?? 50;
        const ids = (await this.listSessionIds()).slice(0, maxSessions);
        const results: SessionSearchMatch[] = [];
        for (const sessionId of ids) {
            const state = await this.get(sessionId);
            const matched = (state.messages || []).filter(message =>
                String(message.content || '').toLowerCase().includes(normalizedQuery));
            if (!matched.length) {
                continue;
            }
            results.push({
                sessionId,
                count: matched.length,
                snippet: `[${matched[0].role}] ${String(matched[0].content || '')}`,
                updatedAt: state.updatedAt ?? state.createdAt,
                summary: state.summary,
                workspace: state.workspace
            });
        }
        results.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
        return results.slice(0, limit);
    }
}
