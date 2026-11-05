import type { AgentSessionSection, SessionSearchMatch } from '@tsdi/agent';
import { AgentConsoleSessionOperationsRpc } from './AgentConsoleSessionOperationsRpc';

/** Session sections and cross-session search RPC. */
export abstract class AgentConsoleSessionSectionRpc extends AgentConsoleSessionOperationsRpc {
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
}
