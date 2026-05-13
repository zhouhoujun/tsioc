import { Injectable } from '@tsdi/ioc';

/**
 * Per-session concurrency control.
 * Prevents concurrent turns on the same session.
 * Mirrors zeroclaw-gateway's session_queue.rs.
 */
@Injectable()
export class SessionQueue {
    private queues = new Map<string, Promise<void>>();

    /** Serialize execution for a session ID */
    async enqueue(sessionId: string, task: () => Promise<void>): Promise<void> {
        const prev = this.queues.get(sessionId) ?? Promise.resolve();
        const next = prev.then(task, task); // run on previous completion even if it failed
        this.queues.set(sessionId, next);
        await next;
    }

    /** Remove a session queue */
    remove(sessionId: string): void {
        this.queues.delete(sessionId);
    }

    /** Clear all queues */
    clear(): void {
        this.queues.clear();
    }
}
