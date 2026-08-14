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
    threadStatus?: AgentThreadStatus;
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
    sections?: AgentSessionSectionInfo[];
    createdAt?: number;
    updatedAt?: number;
    lastActiveAt?: number;
}

/** A named, manually ordered group inside a session transcript (G24). */
export interface AgentSessionSection {
    id: string;
    label: string;
    createdAt: number;
    updatedAt?: number;
}

/** Lightweight section projection used by thread/project indexes and the UI. */
export interface AgentSessionSectionInfo {
    id: string;
    label: string;
    messageCount: number;
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

export interface AgentSessionSnapshotInfo {
    snapshotId: string;
    label?: string;
    messageCount: number;
    summary?: string;
    createdAt: number;
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
    threadStatus?: AgentThreadStatus | null;
    sections?: AgentSessionSection[] | null;
    messages?: AgentMessage[] | null;
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
            sections: undefined,
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
            existing.status = input.threadStatus ?? (role === 'review' ? 'completed' : 'active');
            existing.stage = role === 'review' ? 'review'
                : role === 'worker' ? 'implementation'
                : role === 'branch' ? 'discovery' : undefined;
            existing.sections = deriveSectionInfos(input.sections, input.messages ?? undefined);
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

export function deriveSectionInfos(
    sections?: AgentSessionSection[] | null,
    messages?: AgentMessage[] | string
): AgentSessionSectionInfo[] | undefined {
    const resolved = Array.isArray(sections) ? sections.filter(section => section && String(section.id || '').trim()) : [];
    if (!resolved.length) {
        return undefined;
    }
    const counts = new Map<string, number>();
    if (Array.isArray(messages)) {
        for (const message of messages) {
            const sectionId = String(message?.sectionId || '').trim();
            if (sectionId) {
                counts.set(sectionId, (counts.get(sectionId) ?? 0) + 1);
            }
        }
    }
    return resolved.map(section => ({
        id: section.id,
        label: section.label,
        messageCount: counts.get(section.id) ?? 0
    }));
}

@Abstract()
export abstract class SessionStore {
    abstract get(sessionId: string): Promise<AgentState>;
    abstract has(sessionId: string): Promise<boolean>;
    abstract listSessionIds(): Promise<string[]>;
    abstract listProjects(): Promise<AgentSessionProjectIndex[]>;
    abstract listThreads(): Promise<AgentThreadIndex[]>;
    abstract listSections(sessionId: string): Promise<AgentSessionSection[]>;
    abstract addSection(sessionId: string, label: string, beforeId?: string, sectionId?: string): Promise<AgentSessionSection>;
    abstract renameSection(sessionId: string, sectionId: string, label: string): Promise<void>;
    abstract moveSection(sessionId: string, sectionId: string, beforeId?: string): Promise<void>;
    abstract deleteSection(sessionId: string, sectionId: string): Promise<void>;
    abstract appendRaw(sessionId: string, message: AgentMessage): Promise<AgentState>;
    abstract setSummary(sessionId: string, summary: string): Promise<void>;
    abstract setTitle(sessionId: string, title?: string): Promise<void>;
    abstract setPinned(sessionId: string, pinned: boolean): Promise<void>;
    abstract setArchived(sessionId: string, archived: boolean): Promise<void>;
    abstract snapshot(sessionId: string, label?: string): Promise<string>;
    abstract listSnapshots(sessionId: string): Promise<AgentSessionSnapshotInfo[]>;
    abstract restoreSnapshot(sessionId: string, snapshotId: string): Promise<void>;
    abstract deleteSnapshot(sessionId: string, snapshotId: string): Promise<void>;
    abstract setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void>;
    abstract setWorkspace(sessionId: string, workspace?: string): Promise<void>;
    abstract setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void>;

    /** Append a message, attributing sub-agent messages to their origin-thread section. */
    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        return this.appendRaw(sessionId, await this.attributeMessageSection(sessionId, message));
    }

    /**
     * Attribute a message to a section. Explicit `message.sectionId` wins;
     * otherwise messages whose provenance resolves to an origin thread
     * (message metadata or the session's own sub-agent metadata) are grouped
     * under a per-thread section that is auto-created on first use.
     */
    protected async attributeMessageSection(sessionId: string, message: AgentMessage): Promise<AgentMessage> {
        if (!message || String(message.sectionId || '').trim()) {
            return message;
        }
        const state = await this.get(sessionId);
        const originThreadId = String(message.metadata?.originThreadId || state.originThreadId || '').trim();
        if (!originThreadId) {
            return message;
        }
        const sectionId = `section:${originThreadId}`;
        const existing = state.sections?.find(section => section.id === sectionId);
        if (!existing) {
            const label = String(message.metadata?.originThreadLabel || state.focusSummary || '').trim()
                || `Sub-agent ${originThreadId.slice(0, 8)}`;
            await this.addSection(sessionId, label, undefined, sectionId);
        }
        return { ...message, sectionId };
    }

    /** Fork a transcript into a new branch session, optionally through a message. */
    async fork(sessionId: string, messageId?: string, forkSessionId?: string): Promise<AgentState> {
        const source = await this.get(sessionId);
        const targetId = String(forkSessionId || '').trim()
            || `fork-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const end = messageId ? source.messages.findIndex(message => message.id === messageId) : source.messages.length - 1;
        if (messageId && end < 0) {
            throw new Error(`Message '${messageId}' not found in session '${sessionId}'.`);
        }
        const messages = source.messages.slice(0, end + 1);
        for (const message of messages) {
            await this.append(targetId, { ...message });
        }
        if (Array.isArray(source.sections) && source.sections.length) {
            for (const section of source.sections) {
                await this.addSection(targetId, section.label, undefined, section.id);
            }
        }
        if (source.summary) await this.setSummary(targetId, source.summary);
        await this.setWorkspace(targetId, source.workspace);
        await this.setArchived(targetId, false);
        await this.setProjectMetadata(targetId, {
            projectId: source.projectId,
            primaryThreadId: source.primaryThreadId || sessionId,
            originThreadId: source.primaryThreadId || sessionId,
            sessionRole: 'branch',
            rootRequest: source.rootRequest,
            focusSummary: source.focusSummary,
            threadStatus: 'active'
        });
        return this.get(targetId);
    }
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
