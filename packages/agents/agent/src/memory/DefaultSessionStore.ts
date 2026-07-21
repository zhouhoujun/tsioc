import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { SessionStore } from './SessionStore';
import { InMemorySessionStore } from './InMemorySessionStore';
import { TypeOrmSessionStore } from './TypeOrmSessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';

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

    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        return this.resolveStore().append(sessionId, message);
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        await this.resolveStore().setSummary(sessionId, summary);
    }

    async setOwner(sessionId: string, ownerPrincipalId?: string): Promise<void> {
        await this.resolveStore().setOwner(sessionId, ownerPrincipalId);
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
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmSessionStore(adapter) : this.fallback;
        return this.resolved;
    }

    private tryGetAdapter(): TypeormAdapter | null {
        if (!this.app) {
            return null;
        }
        try {
            return this.app.get(TypeormAdapter, null) as TypeormAdapter | null;
        } catch {
            return null;
        }
    }
}
