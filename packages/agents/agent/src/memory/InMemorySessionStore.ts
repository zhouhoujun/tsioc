import { Injectable } from '@tsdi/ioc';
import { AgentSessionProjectIndex, AgentSessionProjectMetadata, AgentSessionSnapshotInfo, AgentThreadIndex, SessionStore, deriveThreadIndexes } from './SessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';
import { normalizeAgentWorkspaceIdentity } from '../AgentWorkspacePath';

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
            summary: state.summary,
            title: state.title,
            pinned: state.pinned,
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

    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        const state = await this.get(sessionId);
        state.messages.push(message);
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
        return this.get(sessionId);
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
