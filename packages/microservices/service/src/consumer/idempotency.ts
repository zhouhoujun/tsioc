/**
 * Idempotency primitives for at-least-once consumers.
 *
 * Transports decide whether a delivery has a stable identity (Kafka
 * `topic-partition-offset`, AMQP `messageId`, ...). When it does, the runtime
 * reserves that identity before running the handler so a redelivery is
 * acknowledged without repeating side effects.
 */

export interface ConsumerIdempotencyStore {
    /**
     * Reserve `key` for `ttlMs`.
     *
     * @returns `true` when the caller owns the key (first delivery), `false`
     * when it was already reserved (a duplicate).
     */
    reserve(key: string, ttlMs: number): boolean | Promise<boolean>;
    /**
     * Drop a reservation. Called when handling failed, so a redelivery can try
     * again instead of being skipped as a duplicate.
     */
    release(key: string): void | Promise<void>;
}

export interface ConsumerIdempotencyOptions {
    /**
     * reservation store. Defaults to a bounded in-memory store.
     */
    store?: ConsumerIdempotencyStore;
    /**
     * how long a successful delivery is remembered. Default 5 minutes.
     */
    ttlMs?: number;
    /**
     * bound for the default in-memory store. Default 10,000 entries.
     */
    maxEntries?: number;
}

/**
 * Bounded, lazily-expiring in-memory reservation store.
 *
 * Entries are only pruned when the store is full (expired first, then the
 * oldest batch), so no timers are created. When the bound is reached an old
 * entry may be forgotten and a very late duplicate could run again; provide a
 * shared store (Redis) when the dedupe window must be exact across replicas.
 */
export class MemoryIdempotencyStore implements ConsumerIdempotencyStore {
    private readonly entries = new Map<string, number>();
    private readonly maxEntries: number;

    constructor(maxEntries = 10000) {
        this.maxEntries = Math.max(1, maxEntries);
    }

    get size(): number {
        return this.entries.size;
    }

    reserve(key: string, ttlMs: number): boolean {
        const now = Date.now();
        const expiresAt = this.entries.get(key);
        if (expiresAt !== undefined) {
            if (expiresAt > now) {
                return false;
            }
            this.entries.delete(key);
        }
        if (this.entries.size >= this.maxEntries) {
            this.prune(now);
        }
        this.entries.set(key, now + Math.max(0, ttlMs));
        return true;
    }

    release(key: string): void {
        this.entries.delete(key);
    }

    private prune(now: number): void {
        // Entries are inserted in time order and `reserve` is called with one
        // TTL per runtime, so the oldest entry also has the earliest expiry:
        // stop at the first live key instead of scanning the whole map.
        for (const [key, expiresAt] of this.entries) {
            if (expiresAt > now) {
                break;
            }
            this.entries.delete(key);
        }
        if (this.entries.size < this.maxEntries) {
            return;
        }
        // Still full: drop the oldest ~1/8 (Map preserves insertion order).
        const target = Math.max(1, Math.floor(this.maxEntries / 8));
        let removed = 0;
        for (const key of this.entries.keys()) {
            if (removed++ >= target) {
                break;
            }
            this.entries.delete(key);
        }
    }
}
