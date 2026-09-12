import { Injectable } from '@tsdi/ioc';
import { SessionStore } from '@tsdi/agent';

export interface SessionAuthorizeOptions {
    /** Create the session when it does not exist yet (RPC create-idempotent flows). */
    createIfMissing?: boolean;
    /** Reject (throw Forbidden) when no principal is supplied — REST strict mode. */
    requirePrincipal?: boolean;
    /** Do not auto-claim ownerless sessions (default claims them) — REST strict mode. */
    allowClaim?: boolean;
}

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

    /** @deprecated use {@link isAuthorized} — identical semantics through the shared authorize seam. */
    async isOwner(sessionId: string, principalId?: string): Promise<boolean> {
        return this.isAuthorized(sessionId, principalId);
    }

    /**
     * Strict REST capability check over the shared `authorize` seam.
     * Resolves false for every reject path (no principal, missing session,
     * ownerless session, foreign owner) so REST handlers keep their 403 contract.
     */
    async isAuthorized(sessionId: string, principalId?: string): Promise<boolean> {
        try {
            await this.authorize(sessionId, principalId, { requirePrincipal: true, allowClaim: false });
            return true;
        } catch {
            return false;
        }
    }

    /** Enforce session ownership for RPC/transport callers using one shared policy. */
    async authorize(sessionId: string, principalId?: string, options?: SessionAuthorizeOptions): Promise<'created' | 'owned' | 'anonymous'> {
        const exists = await this.sessions.has(sessionId);
        if (!exists && options?.createIfMissing) {
            await this.create(sessionId, principalId);
            return 'created';
        }
        if (!exists) {
            throw new Error(`Session '${sessionId}' not found`);
        }
        if (!principalId) {
            if (options?.requirePrincipal) {
                throw new Error('Forbidden');
            }
            return 'anonymous';
        }
        const owner = await this.getOwner(sessionId);
        if (!owner) {
            if (options?.allowClaim === false) {
                throw new Error('Forbidden');
            }
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
