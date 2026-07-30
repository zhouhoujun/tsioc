import { Injectable } from '@tsdi/ioc';
import { AgentSessionProjectIndex, AgentSessionProjectMetadata, SessionStore } from './SessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';

@Injectable()
export class InMemorySessionStore extends SessionStore {
    private sessions = new Map<string, AgentState>();

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
            ownerPrincipalId: state.ownerPrincipalId,
            workspace: state.workspace,
            projectId: state.projectId,
            primaryThreadId: state.primaryThreadId,
            sessionRole: state.sessionRole,
            rootRequest: state.rootRequest,
            focusSummary: state.focusSummary,
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
        const buckets = new Map<string, AgentSessionProjectIndex>();
        for (const state of this.sessions.values()) {
            const projectKey = this.resolveProjectKey(state);
            const existing = buckets.get(projectKey) ?? {
                projectKey,
                projectId: state.projectId,
                workspace: state.workspace,
                primaryThreadId: state.primaryThreadId,
                sessionIds: [],
                lastActiveAt: 0
            };
            existing.sessionIds.push(state.sessionId);
            existing.lastActiveAt = Math.max(existing.lastActiveAt || 0, state.updatedAt || state.createdAt || 0);
            existing.projectId = existing.projectId || state.projectId;
            existing.workspace = existing.workspace || state.workspace;
            existing.primaryThreadId = existing.primaryThreadId || state.primaryThreadId;
            buckets.set(projectKey, existing);
        }
        return Array.from(buckets.values()).sort((left, right) => {
            const activityDelta = (right.lastActiveAt || 0) - (left.lastActiveAt || 0);
            if (activityDelta !== 0) {
                return activityDelta;
            }
            return left.projectKey.localeCompare(right.projectKey);
        });
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
        state.sessionRole = String(metadata.sessionRole || '').trim() || undefined;
        state.rootRequest = String(metadata.rootRequest || '').trim() || undefined;
        state.focusSummary = String(metadata.focusSummary || '').trim() || undefined;
        state.updatedAt = Date.now();
        state.createdAt ??= state.updatedAt;
        this.sessions.set(sessionId, state);
    }

    delete(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    clear(): void {
        this.sessions.clear();
    }

    protected resolveProjectKey(state: AgentState): string {
        const projectId = String(state.projectId || '').trim();
        if (projectId) {
            return `project:${projectId}`;
        }
        const workspace = String(state.workspace || '').trim();
        if (workspace) {
            return `workspace:${workspace}`;
        }
        const primaryThreadId = String(state.primaryThreadId || '').trim();
        if (primaryThreadId) {
            return `thread:${primaryThreadId}`;
        }
        return `session:${state.sessionId}`;
    }
}
