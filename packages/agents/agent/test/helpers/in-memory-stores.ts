/**
 * Test-only InMemory store implementations.
 * These are NOT for production use — production uses TypeORM-backed stores.
 * Deleted from src/ to prevent accidental production dependency.
 */
import { AgentMemoryRecord, MemoryStore } from '../../src/memory/MemoryStore';
import {
    AgentSessionProjectIndex, AgentSessionProjectMetadata, AgentSessionSection, AgentSessionSnapshotInfo,
    AgentThreadIndex, SessionStore, deriveThreadIndexes
} from '../../src/memory/SessionStore';
import { AgentState } from '../../src/runtime/AgentState';
import { AgentMessage } from '../../src/runtime/AgentMessage';
import { normalizeAgentWorkspaceIdentity } from '../../src/AgentWorkspacePath';
import { CreateGoalInput, Goal, GoalStatus, GoalStore } from '../../src/goal/GoalStore';
import {
    TimelineEventRecord, TimelineHistoryStore, TimelineNoncePage, TimelinePageOptions,
    pageTimelineEntries, sortTimelineEntries, reduceTimelineEvents
} from '../../src/memory/timeline-projection';
import {
    BackgroundTaskHistoryStore, BackgroundTaskPage, BackgroundTaskPageOptions,
    BackgroundTaskRecord, BackgroundTaskHistoryListener, BackgroundTaskCursor,
    pageBackgroundTaskRecords, cloneBackgroundTaskRecord
} from '../../src/memory/background-task-store';
import { Injectable } from '@tsdi/ioc';


// ── InMemoryMemoryStore ──

@Injectable()
export class InMemoryMemoryStore extends MemoryStore {
    private records: AgentMemoryRecord[] = [];

    async put(record: AgentMemoryRecord): Promise<void> {
        this.records.push(record);
    }

    async search(query: string, sessionId?: string): Promise<AgentMemoryRecord[]> {
        const lower = query.toLowerCase();
        return this.records.filter(record => {
            const scoped = record.scope === 'global' || !sessionId || record.sessionId === sessionId;
            return scoped && (
                record.key.toLowerCase().includes(lower) ||
                record.value.toLowerCase().includes(lower)
            );
        });
    }

    async getAll(sessionId?: string): Promise<AgentMemoryRecord[]> {
        return this.records.filter(record => record.scope === 'global' || !sessionId || record.sessionId === sessionId);
    }

    async delete(id: string, sessionId?: string, scope?: AgentMemoryRecord['scope']): Promise<number> {
        const before = this.records.length;
        this.records = this.records.filter(record => {
            if (record.id !== id) return true;
            if (scope && record.scope !== scope) return true;
            if (record.scope === 'global') return scope !== 'global';
            if (!sessionId) return true;
            return record.sessionId !== sessionId;
        });
        return before - this.records.length;
    }

    async deleteBySession(sessionId: string): Promise<number> {
        const before = this.records.length;
        this.records = this.records.filter(record => {
            if (record.scope === 'global') return true;
            return record.sessionId !== sessionId;
        });
        return before - this.records.length;
    }
}


// ── InMemoryGoalStore ──

@Injectable()
export class InMemoryGoalStore extends GoalStore {
    private readonly goals = new Map<string, Goal>();
    private readonly sessionGoals = new Map<string, string>();

    async create(input: CreateGoalInput): Promise<Goal> {
        const now = Date.now();
        const goal: Goal = {
            id: String(input.id || `goal-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
            title: required(input.title, 'title'),
            objective: required(input.objective, 'objective'),
            successCriteria: normalizeCriteria(input.successCriteria),
            status: 'active', createdAt: now, updatedAt: now
        };
        this.goals.set(goal.id, goal);
        return cloneGoal(goal);
    }

    async get(goalId: string): Promise<Goal | undefined> {
        const goal = this.goals.get(goalId);
        return goal ? cloneGoal(goal) : undefined;
    }

    async list(status?: GoalStatus): Promise<Goal[]> {
        return [...this.goals.values()].filter(goal => !status || goal.status === status)
            .sort((a, b) => b.updatedAt - a.updatedAt).map(cloneGoal);
    }

    async update(goalId: string, patch: Partial<Pick<Goal, 'title' | 'objective' | 'successCriteria' | 'status'>>): Promise<Goal> {
        const current = this.goals.get(goalId);
        if (!current) throw new Error(`Goal '${goalId}' not found.`);
        const now = Date.now();
        const next: Goal = {
            ...current,
            ...(patch.title !== undefined ? { title: required(patch.title, 'title') } : {}),
            ...(patch.objective !== undefined ? { objective: required(patch.objective, 'objective') } : {}),
            ...(patch.successCriteria !== undefined ? { successCriteria: normalizeCriteria(patch.successCriteria) } : {}),
            ...(patch.status ? { status: patch.status } : {}),
            updatedAt: now,
            completedAt: patch.status === 'completed' ? now : patch.status === 'active' ? undefined : current.completedAt
        };
        this.goals.set(goalId, next);
        return cloneGoal(next);
    }

    async linkSession(sessionId: string, goalId?: string): Promise<void> {
        if (!goalId) { this.sessionGoals.delete(sessionId); return; }
        if (!this.goals.has(goalId)) throw new Error(`Goal '${goalId}' not found.`);
        this.sessionGoals.set(sessionId, goalId);
    }

    async getSessionGoal(sessionId: string): Promise<Goal | undefined> {
        const id = this.sessionGoals.get(sessionId);
        return id ? this.get(id) : undefined;
    }
}

function required(value: string, field: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) throw new Error(`Goal ${field} is required.`);
    return normalized;
}

function normalizeCriteria(items?: string[]): string[] {
    return [...new Set((items || []).map(item => String(item).trim()).filter(Boolean))];
}

function cloneGoal(goal: Goal): Goal { return { ...goal, successCriteria: [...goal.successCriteria] }; }


// ── InMemoryTimelineHistoryStore ──

@Injectable()
export class InMemoryTimelineHistoryStore extends TimelineHistoryStore {
    private readonly sessions = new Map<string, { nextSeq: number; events: TimelineEventRecord[] }>();

    private bucket(sessionId: string): { nextSeq: number; events: TimelineEventRecord[] } {
        let bucket = this.sessions.get(sessionId);
        if (!bucket) {
            bucket = { nextSeq: 0, events: [] };
            this.sessions.set(sessionId, bucket);
        }
        return bucket;
    }

    async append(event: Omit<TimelineEventRecord, 'seq'>): Promise<TimelineEventRecord> {
        const bucket = this.bucket(event.sessionId);
        const seq = bucket.nextSeq;
        bucket.nextSeq += 1;
        const record: TimelineEventRecord = { ...event, seq };
        bucket.events.push(record);
        return record;
    }

    async get(sessionId: string): Promise<TimelineEventRecord[]> {
        const bucket = this.sessions.get(sessionId);
        return bucket ? bucket.events.slice() : [];
    }

    async replay(sessionId: string, sinceSeq?: number): Promise<TimelineEventRecord[]> {
        const bucket = this.sessions.get(sessionId);
        if (!bucket) return [];
        const from = typeof sinceSeq === 'number' && Number.isFinite(sinceSeq) ? sinceSeq + 1 : 0;
        return bucket.events.filter(event => event.seq >= from);
    }

    async query(sessionId: string, options?: TimelinePageOptions): Promise<TimelineNoncePage> {
        const raw = await this.get(sessionId);
        return pageTimelineEntries(sortTimelineEntries(reduceTimelineEvents(raw).values()), options);
    }
}


// ── InMemoryBackgroundTaskHistoryStore ──

@Injectable()
export class InMemoryBackgroundTaskHistoryStore extends BackgroundTaskHistoryStore {
    private readonly tasks = new Map<string, BackgroundTaskRecord>();
    private readonly listeners = new Set<BackgroundTaskHistoryListener>();

    async put(record: BackgroundTaskRecord): Promise<void> {
        this.tasks.set(record.id, cloneBackgroundTaskRecord(record));
        const snapshot = cloneBackgroundTaskRecord(record);
        this.listeners.forEach(listener => {
            try { listener(snapshot); } catch { /* swallow */ }
        });
    }

    async get(taskId: string): Promise<BackgroundTaskRecord | undefined> {
        const record = this.tasks.get(taskId);
        return record ? cloneBackgroundTaskRecord(record) : undefined;
    }

    async pageAll(options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> {
        return this.paginate(undefined, options?.cursor, options?.limit);
    }

    async pageBySession(sessionId: string, options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> {
        return this.paginate(sessionId, options?.cursor, options?.limit);
    }

    async batchCancel(taskIds: string[]): Promise<string[]> {
        const cancelled: string[] = [];
        for (const taskId of new Set(taskIds)) {
            const record = this.tasks.get(taskId);
            if (record && record.status === 'running') {
                const next: BackgroundTaskRecord = { ...record, status: 'cancelled', finishedAt: Date.now(), updatedAt: Date.now() };
                this.tasks.set(taskId, next);
                const snapshot = cloneBackgroundTaskRecord(next);
                this.listeners.forEach(listener => {
                    try { listener(snapshot); } catch { /* swallow */ }
                });
                cancelled.push(taskId);
            }
        }
        return cancelled;
    }

    subscribe(listener: BackgroundTaskHistoryListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private async paginate(sessionId: string | undefined, cursor?: BackgroundTaskCursor, limit?: number): Promise<BackgroundTaskPage> {
        const sorted = Array.from(this.tasks.values())
            .filter(record => !sessionId || record.sessionId === sessionId)
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
        return pageBackgroundTaskRecords(sorted, { cursor, limit });
    }
}


// Recovered from removed src/memory/InMemorySessionStore (git 646e4560d) as a test-local helper.
interface AgentSessionSnapshotEntry {
    snapshotId: string;
    label?: string;
    messages: AgentMessage[];
    summary?: string;
    createdAt: number;
}

@Injectable()
export class InMemorySessionStore extends SessionStore {
    private sessions = new Map<string, AgentState>();
    private snapshots = new Map<string, Map<string, AgentSessionSnapshotEntry>>();

    async get(sessionId: string): Promise<AgentState> {
        let state = this.sessions.get(sessionId);
        if (!state) {
            const now = Date.now();
            state = { sessionId, messages: [], createdAt: now, updatedAt: now };
            this.sessions.set(sessionId, state);
        }
        return {
            sessionId: state.sessionId,
            messages: state.messages.slice(),
            sections: Array.isArray(state.sections) ? state.sections.map(section => ({ ...section })) : undefined,
            summary: state.summary,
            title: state.title,
            pinned: state.pinned,
            archived: state.archived,
            ownerPrincipalId: state.ownerPrincipalId,
            workspace: state.workspace,
            projectId: state.projectId,
            primaryThreadId: state.primaryThreadId,
            originThreadId: state.originThreadId,
            sessionRole: state.sessionRole,
            rootRequest: state.rootRequest,
            focusSummary: state.focusSummary,
            threadStatus: state.threadStatus,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt
        };
    }

    async has(sessionId: string): Promise<boolean> {
        return this.sessions.has(sessionId);
    }

    async listSessionIds(): Promise<string[]> {
        return Array.from(this.sessions.keys());
    }

    async listProjects(): Promise<AgentSessionProjectIndex[]> {
        const buckets = new Map<string, AgentSessionProjectIndex & {
            representativeLastActiveAt: number;
            representativeSessionId: string;
            sessionEntries: Array<{ id: string; lastActiveAt: number }>;
        }>();
        for (const state of this.sessions.values()) {
            const projectKey = this.resolveProjectKey(state);
            const lastActiveAt = state.updatedAt || state.createdAt || 0;
            const existing = buckets.get(projectKey) ?? {
                projectKey,
                projectId: undefined,
                workspace: undefined,
                primaryThreadId: undefined,
                sessionRole: undefined,
                rootRequest: undefined,
                focusSummary: undefined,
                sessionIds: [],
                lastActiveAt: 0,
                representativeLastActiveAt: -1,
                representativeSessionId: '',
                sessionEntries: []
            };
            existing.sessionIds.push(state.sessionId);
            existing.sessionEntries.push({ id: state.sessionId, lastActiveAt });
            existing.lastActiveAt = Math.max(existing.lastActiveAt || 0, lastActiveAt);
            if (lastActiveAt > existing.representativeLastActiveAt
                || (lastActiveAt === existing.representativeLastActiveAt
                    && (!existing.representativeSessionId || state.sessionId.localeCompare(existing.representativeSessionId) < 0))) {
                existing.projectId = state.projectId;
                existing.workspace = state.workspace;
                existing.primaryThreadId = state.primaryThreadId;
                existing.sessionRole = state.sessionRole;
                existing.rootRequest = state.rootRequest;
                existing.focusSummary = state.focusSummary;
                existing.representativeLastActiveAt = lastActiveAt;
                existing.representativeSessionId = state.sessionId;
            }
            buckets.set(projectKey, existing);
        }
        return Array.from(buckets.values()).map(({
            representativeLastActiveAt: _representativeLastActiveAt,
            representativeSessionId: _representativeSessionId,
            sessionEntries,
            ...project
        }) => ({
            ...project,
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
            return left.projectKey.localeCompare(right.projectKey);
        });
    }

    async listThreads(): Promise<AgentThreadIndex[]> {
        return deriveThreadIndexes(Array.from(this.sessions.values()));
    }

    async appendRaw(sessionId: string, message: AgentMessage): Promise<AgentState> {
        const state = await this.get(sessionId);
        state.messages.push(message);
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
        return this.get(sessionId);
    }

    async listSections(sessionId: string): Promise<AgentSessionSection[]> {
        const state = await this.get(sessionId);
        return Array.isArray(state.sections) ? state.sections.map(section => ({ ...section })) : [];
    }

    async addSection(sessionId: string, label: string, beforeId?: string, sectionId?: string): Promise<AgentSessionSection> {
        const normalizedLabel = String(label || '').trim();
        if (!normalizedLabel) {
            throw new Error('section label required');
        }
        const state = await this.get(sessionId);
        const sections = Array.isArray(state.sections) ? state.sections : [];
        const id = String(sectionId || '').trim() || `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        if (sections.some(section => section.id === id)) {
            throw new Error(`section '${id}' already exists`);
        }
        const section: AgentSessionSection = { id, label: normalizedLabel, createdAt: Date.now() };
        const insertAt = String(beforeId || '').trim()
            ? sections.findIndex(existing => existing.id === beforeId)
            : -1;
        if (insertAt >= 0) {
            sections.splice(insertAt, 0, section);
        } else {
            sections.push(section);
        }
        state.sections = sections;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
        return { ...section };
    }

    async renameSection(sessionId: string, sectionId: string, label: string): Promise<void> {
        const normalizedLabel = String(label || '').trim();
        if (!normalizedLabel) {
            throw new Error('section label required');
        }
        const state = await this.get(sessionId);
        const section = (Array.isArray(state.sections) ? state.sections : []).find(existing => existing.id === sectionId);
        if (!section) {
            throw new Error(`section '${sectionId}' not found`);
        }
        section.label = normalizedLabel;
        section.updatedAt = Date.now();
        state.updatedAt = Date.now();
        this.sessions.set(sessionId, state);
    }

    async moveSection(sessionId: string, sectionId: string, beforeId?: string): Promise<void> {
        const state = await this.get(sessionId);
        const sections = Array.isArray(state.sections) ? state.sections : [];
        const index = sections.findIndex(existing => existing.id === sectionId);
        if (index < 0) {
            throw new Error(`section '${sectionId}' not found`);
        }
        const [section] = sections.splice(index, 1);
        const target = String(beforeId || '').trim()
            ? sections.findIndex(existing => existing.id === beforeId)
            : -1;
        if (target >= 0) {
            sections.splice(target, 0, section);
        } else {
            sections.push(section);
        }
        state.sections = sections;
        state.updatedAt = Date.now();
        this.sessions.set(sessionId, state);
    }

    async deleteSection(sessionId: string, sectionId: string): Promise<void> {
        const state = await this.get(sessionId);
        if (!Array.isArray(state.sections) || !state.sections.some(section => section.id === sectionId)) {
            return;
        }
        state.sections = state.sections.filter(section => section.id !== sectionId);
        for (const message of state.messages) {
            if (message.sectionId === sectionId) {
                message.sectionId = undefined;
            }
        }
        state.updatedAt = Date.now();
        this.sessions.set(sessionId, state);
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        const state = await this.get(sessionId);
        state.summary = summary;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async setTitle(sessionId: string, title?: string): Promise<void> {
        const state = await this.get(sessionId);
        state.title = String(title || '').trim() || undefined;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async setPinned(sessionId: string, pinned: boolean): Promise<void> {
        const state = await this.get(sessionId);
        state.pinned = !!pinned;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async setArchived(sessionId: string, archived: boolean): Promise<void> {
        const state = await this.get(sessionId);
        state.archived = !!archived;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async snapshot(sessionId: string, label?: string): Promise<string> {
        const state = await this.get(sessionId);
        const snapshotId = `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        let bucket = this.snapshots.get(sessionId);
        if (!bucket) {
            bucket = new Map<string, AgentSessionSnapshotEntry>();
            this.snapshots.set(sessionId, bucket);
        }
        bucket.set(snapshotId, {
            snapshotId,
            label: String(label || '').trim() || undefined,
            messages: state.messages.slice(),
            summary: state.summary,
            createdAt: Date.now()
        });
        return snapshotId;
    }

    async listSnapshots(sessionId: string): Promise<AgentSessionSnapshotInfo[]> {
        const bucket = this.snapshots.get(sessionId);
        if (!bucket) {
            return [];
        }
        return Array.from(bucket.values())
            .sort((left, right) => right.createdAt - left.createdAt)
            .map(entry => ({
                snapshotId: entry.snapshotId,
                label: entry.label,
                messageCount: entry.messages.length,
                summary: entry.summary,
                createdAt: entry.createdAt
            }));
    }

    async restoreSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        const entry = this.snapshots.get(sessionId)?.get(snapshotId);
        if (!entry) {
            throw new Error(`snapshot not found: ${snapshotId}`);
        }
        const state = await this.get(sessionId);
        state.messages = entry.messages.slice();
        state.summary = entry.summary;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async deleteSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        const bucket = this.snapshots.get(sessionId);
        if (!bucket?.delete(snapshotId)) {
            return;
        }
        if (!bucket.size) {
            this.snapshots.delete(sessionId);
        }
    }

    async setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void> {
        const state = this.sessions.get(sessionId);
        if (!state) {
            if (ownerPrincipalId == null) {
                return;
            }
            const now = Date.now();
            this.sessions.set(sessionId, { sessionId, messages: [], ownerPrincipalId, createdAt: now, updatedAt: now });
            return;
        }
        state.ownerPrincipalId = ownerPrincipalId;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async setWorkspace(sessionId: string, workspace?: string): Promise<void> {
        const normalizedWorkspace = String(workspace || '').trim();
        const state = await this.get(sessionId);
        state.workspace = normalizedWorkspace || undefined;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    async setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void> {
        const state = await this.get(sessionId);
        state.projectId = String(metadata.projectId || '').trim() || undefined;
        state.primaryThreadId = String(metadata.primaryThreadId || '').trim() || undefined;
        state.originThreadId = String(metadata.originThreadId || '').trim() || undefined;
        state.sessionRole = String(metadata.sessionRole || '').trim() || undefined;
        state.rootRequest = String(metadata.rootRequest || '').trim() || undefined;
        state.focusSummary = String(metadata.focusSummary || '').trim() || undefined;
        state.threadStatus = String(metadata.threadStatus || '').trim() || undefined;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    delete(sessionId: string): void {
        this.sessions.delete(sessionId);
        this.snapshots.delete(sessionId);
    }

    clear(): void {
        this.sessions.clear();
        this.snapshots.clear();
    }

    protected resolveProjectKey(state: AgentState): string {
        const projectId = String(state.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const primaryThreadId = String(state.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        const workspace = String(state.workspace || '').trim();
        const workspaceKey = normalizeAgentWorkspaceIdentity(workspace);
        if (workspaceKey) {
            return `workspace:${workspaceKey}`;
        }
        return `session:${state.sessionId}`;
    }
}
