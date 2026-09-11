import { Injectable } from '@tsdi/ioc';
import { SessionStore } from '@tsdi/agent';

@Injectable()
export class SessionOwnerStore {
    constructor(private sessions: SessionStore) {
    }

    async create(sessionId: string, principalId?: string): Promise<void> {
        if (!principalId) {
            return;
        }
        await this.sessions.setOwner(sessionId, principalId);
    }

    async getOwner(sessionId: string): Promise<string | undefined> {
        if (!await this.sessions.has(sessionId)) {
            return undefined;
        }
        return (await this.sessions.get(sessionId)).ownerPrincipalId;
    }

    async hasOwner(sessionId: string): Promise<boolean> {
        return !!(await this.getOwner(sessionId));
    }

    async isOwner(sessionId: string, principalId?: string): Promise<boolean> {
        if (!principalId) {
            return false;
        }
        return (await this.getOwner(sessionId)) === principalId;
    }

    /** Enforce session ownership for RPC/transport callers using one shared policy. */
    async authorize(sessionId: string, principalId?: string, options?: { createIfMissing?: boolean }): Promise<'created' | 'owned' | 'anonymous'> {
        const exists = await this.sessions.has(sessionId);
        if (!exists && options?.createIfMissing) {
            await this.create(sessionId, principalId);
            return 'created';
        }
        if (!exists) {
            throw new Error(`Session '${sessionId}' not found`);
        }
        if (!principalId) {
            return 'anonymous';
        }
        const owner = await this.getOwner(sessionId);
        if (!owner) {
            await this.create(sessionId, principalId);
            return 'created';
        }
        if (owner !== principalId) {
            throw new Error('Forbidden');
        }
        return 'owned';
    }

    async canResume(sessionId: string, principalId?: string): Promise<boolean> {
        if (!principalId) {
            return false;
        }
        return (await this.getOwner(sessionId)) === principalId;
    }

    async listOwned(sessionIds: Iterable<string>, principalId?: string): Promise<string[]> {
        if (!principalId) {
            return [];
        }
        const owned: string[] = [];
        for (const sessionId of sessionIds) {
            if ((await this.getOwner(sessionId)) === principalId) {
                owned.push(sessionId);
            }
        }
        return owned;
    }

    async unbind(sessionId: string): Promise<void> {
        await this.sessions.setOwner(sessionId, undefined);
    }

    async clear(): Promise<void> {
        const sessionIds = await this.sessions.listSessionIds();
        await Promise.all(sessionIds.map(sessionId => this.sessions.setOwner(sessionId, undefined)));
    }
}
