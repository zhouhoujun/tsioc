import type { SessionStore } from '../memory/SessionStore';

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const DEFAULT_HEARTBEAT_MS = 30 * 1000;

interface LeaseEntry {
    refs: number;
    timer?: ReturnType<typeof setInterval>;
}

/**
 * One process-wide lease per session, ref-counted across queued turns. The
 * lease is claimed before a turn waits in the in-memory queue, so another
 * process cannot start the same session while this one has work pending.
 */
export class SessionTurnLeaseManager {
    private leases = new Map<string, LeaseEntry>();
    private entering = new Map<string, Promise<void>>();

    constructor(
        private readonly sessions: SessionStore,
        private readonly ownerId: string,
        private readonly ttlMs = DEFAULT_TTL_MS,
        private readonly heartbeatMs = DEFAULT_HEARTBEAT_MS
    ) {
    }

    async enter(sessionId: string): Promise<() => void> {
        // Serialize concurrent enter() calls for the same session: the in-memory
        // queue may start two turns in the same tick before the first lease row
        // is visible, and SQLite would then reject the second insert.
        const previous = this.entering.get(sessionId) ?? Promise.resolve();
        const current = previous.catch(() => undefined).then(() => this.enterNow(sessionId));
        const serialized = current.then(() => undefined, () => undefined);
        this.entering.set(sessionId, serialized);
        try {
            return await current;
        } finally {
            if (this.entering.get(sessionId) === serialized) {
                this.entering.delete(sessionId);
            }
        }
    }

    private async enterNow(sessionId: string): Promise<() => void> {
        const existing = this.leases.get(sessionId);
        if (existing) {
            existing.refs += 1;
            return () => this.release(sessionId);
        }
        const acquired = await this.sessions.acquireTurnLease(sessionId, this.ownerId, this.ttlMs);
        if (!acquired) {
            throw new Error(`Session '${sessionId}' is already running in another process. Retry after it finishes.`);
        }
        const timer = setInterval(() => {
            void this.sessions.renewTurnLease(sessionId, this.ownerId, this.ttlMs).catch(() => undefined);
        }, this.heartbeatMs);
        (timer as any)?.unref?.();
        this.leases.set(sessionId, { refs: 1, timer });
        return () => this.release(sessionId);
    }

    private release(sessionId: string): void {
        const entry = this.leases.get(sessionId);
        if (!entry) {
            return;
        }
        entry.refs -= 1;
        if (entry.refs > 0) {
            return;
        }
        if (entry.timer) {
            clearInterval(entry.timer);
        }
        this.leases.delete(sessionId);
        void this.sessions.releaseTurnLease(sessionId, this.ownerId).catch(() => undefined);
    }
}
