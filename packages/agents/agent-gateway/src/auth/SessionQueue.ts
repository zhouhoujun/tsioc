import { Injectable } from '@tsdi/ioc';

/**
 * Per-session concurrency control.
 * Prevents concurrent turns on the same session.
 * Mirrors zeroclaw-gateway's session_queue.rs.
 */
const MAX_PENDING_TASKS = 32;

@Injectable()
export class SessionQueue {
    private queues = new Map<string, Promise<void>>();
    private depths = new Map<string, number>();

    /** Serialize execution for a session ID */
    async enqueue(sessionId: string, task: () => Promise<void>): Promise<void> {
        const depth = this.depths.get(sessionId) ?? 0;
        if (depth >= MAX_PENDING_TASKS) {
            throw new Error('session queue limit reached');
        }
        this.depths.set(sessionId, depth + 1);

        const prev = this.queues.get(sessionId) ?? Promise.resolve();
        const next = prev.then(task, task).finally(() => {
            const currentDepth = this.depths.get(sessionId) ?? 1;
            if (currentDepth <= 1) {
                this.depths.delete(sessionId);
                if (this.queues.get(sessionId) === next) {
                    this.queues.delete(sessionId);
                }
                return;
            }
            this.depths.set(sessionId, currentDepth - 1);
            if (this.queues.get(sessionId) === next && currentDepth - 1 === 0) {
                this.queues.delete(sessionId);
            }
        });
        this.queues.set(sessionId, next);
        await next;
    }

    /** Remove a session queue */
    remove(sessionId: string): void {
        this.queues.delete(sessionId);
        this.depths.delete(sessionId);
    }

    /** Clear all queues */
    clear(): void {
        this.queues.clear();
        this.depths.clear();
    }
}
