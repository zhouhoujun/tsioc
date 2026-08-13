import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { SessionStore } from './SessionStore';
import { InMemorySessionStore } from './InMemorySessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';
import { AgentSessionProjectIndex, AgentSessionProjectMetadata, AgentSessionSection, AgentSessionSnapshotInfo, AgentThreadIndex } from './SessionStore';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultSessionStore extends SessionStore {
    private resolved?: SessionStore;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemorySessionStore
    ) {
        super();
    }

    async get(sessionId: string): Promise<AgentState> {
        return this.resolveStore().get(sessionId);
    }

    async has(sessionId: string): Promise<boolean> {
        return this.resolveStore().has(sessionId);
    }

    async listSessionIds(): Promise<string[]> {
        return this.resolveStore().listSessionIds();
    }

    async listProjects(): Promise<AgentSessionProjectIndex[]> {
        return this.resolveStore().listProjects();
    }

    async listThreads(): Promise<AgentThreadIndex[]> {
        return this.resolveStore().listThreads();
    }

    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        return this.resolveStore().append(sessionId, message);
    }

    async appendRaw(sessionId: string, message: AgentMessage): Promise<AgentState> {
        return this.resolveStore().appendRaw(sessionId, message);
    }

    async listSections(sessionId: string): Promise<AgentSessionSection[]> {
        return this.resolveStore().listSections(sessionId);
    }

    async addSection(sessionId: string, label: string, beforeId?: string, sectionId?: string): Promise<AgentSessionSection> {
        return this.resolveStore().addSection(sessionId, label, beforeId, sectionId);
    }

    async renameSection(sessionId: string, sectionId: string, label: string): Promise<void> {
        await this.resolveStore().renameSection(sessionId, sectionId, label);
    }

    async moveSection(sessionId: string, sectionId: string, beforeId?: string): Promise<void> {
        await this.resolveStore().moveSection(sessionId, sectionId, beforeId);
    }

    async deleteSection(sessionId: string, sectionId: string): Promise<void> {
        await this.resolveStore().deleteSection(sessionId, sectionId);
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        await this.resolveStore().setSummary(sessionId, summary);
    }

    async setTitle(sessionId: string, title?: string): Promise<void> {
        await this.resolveStore().setTitle(sessionId, title);
    }

    async setPinned(sessionId: string, pinned: boolean): Promise<void> {
        await this.resolveStore().setPinned(sessionId, pinned);
    }

    async snapshot(sessionId: string, label?: string): Promise<string> {
        return this.resolveStore().snapshot(sessionId, label);
    }

    async listSnapshots(sessionId: string): Promise<AgentSessionSnapshotInfo[]> {
        return this.resolveStore().listSnapshots(sessionId);
    }

    async restoreSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        await this.resolveStore().restoreSnapshot(sessionId, snapshotId);
    }

    async deleteSnapshot(sessionId: string, snapshotId: string): Promise<void> {
        await this.resolveStore().deleteSnapshot(sessionId, snapshotId);
    }

    async setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void> {
        await this.resolveStore().setOwner(sessionId, ownerPrincipalId);
    }

    async setWorkspace(sessionId: string, workspace?: string): Promise<void> {
        await this.resolveStore().setWorkspace(sessionId, workspace);
    }

    async setProjectMetadata(sessionId: string, metadata: AgentSessionProjectMetadata): Promise<void> {
        await this.resolveStore().setProjectMetadata(sessionId, metadata);
    }

    async delete(sessionId: string): Promise<void> {
        await this.resolveStore().delete(sessionId);
    }

    async clear(): Promise<void> {
        await this.resolveStore().clear();
    }

    private resolveStore(): SessionStore {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = resolveTypeormAdapter(this.app);
        this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmSessionStore(adapter) : this.fallback;
        return this.resolved;
    }
}
