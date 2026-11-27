/**
 * Minimal outbox primitive for at-least-once publishing.
 *
 * Applications persist an outbox record in the same transaction as their
 * business write, then a dispatcher drains it to a broker. The interfaces are
 * storage/send agnostic; `MemoryOutboxStore` is provided for tests and
 * single-process workers.
 */
export interface OutboxMessage<T = any> {
    id: string;
    topic: string;
    payload: T;
    headers?: Record<string, string>;
    createdAt: number;
    attempts: number;
    nextAttemptAt: number;
}

export interface OutboxAddOptions<T = any> {
    id?: string;
    topic: string;
    payload: T;
    headers?: Record<string, string>;
    nextAttemptAt?: number;
}

export interface OutboxStore {
    add<T = any>(message: OutboxAddOptions<T>): Promise<OutboxMessage<T>>;
    claim(limit: number, now?: number): Promise<OutboxMessage[]>;
    ack(id: string): Promise<void>;
    fail(id: string, nextAttemptAt: number): Promise<void>;
    size(): Promise<number>;
}

let outboxSequence = 0;

/** Bounded in-memory outbox; intended for tests and single-process workers. */
export class MemoryOutboxStore implements OutboxStore {
    private readonly records = new Map<string, OutboxMessage & { claimed?: boolean }>();

    constructor(private readonly maxEntries = 10_000) { }

    async add<T = any>(message: OutboxAddOptions<T>): Promise<OutboxMessage<T>> {
        if (this.records.size >= this.maxEntries) {
            throw new Error(`outbox is full (${this.maxEntries} entries)`);
        }
        const id = message.id ?? `outbox-${Date.now().toString(36)}-${(outboxSequence++).toString(36)}`;
        const record: OutboxMessage<T> = {
            id,
            topic: message.topic,
            payload: message.payload,
            headers: message.headers,
            createdAt: Date.now(),
            attempts: 0,
            nextAttemptAt: message.nextAttemptAt ?? 0
        };
        this.records.set(id, record);
        return { ...record };
    }

    async claim(limit: number, now = Date.now()): Promise<OutboxMessage[]> {
        const claimed: OutboxMessage[] = [];
        for (const record of this.records.values()) {
            if (claimed.length >= Math.max(0, limit)) {
                break;
            }
            if (record.claimed || record.nextAttemptAt > now) {
                continue;
            }
            record.claimed = true;
            claimed.push({ ...record });
        }
        return claimed;
    }

    async ack(id: string): Promise<void> {
        this.records.delete(id);
    }

    async fail(id: string, nextAttemptAt: number): Promise<void> {
        const record = this.records.get(id);
        if (!record) {
            return;
        }
        record.claimed = false;
        record.attempts += 1;
        record.nextAttemptAt = nextAttemptAt;
    }

    async size(): Promise<number> {
        return this.records.size;
    }
}

export interface OutboxDispatcherOptions {
    /** messages claimed per flush. Default 20. */
    batchSize?: number;
    /** polling interval. Default 1000ms. */
    intervalMs?: number;
    /** delay before a failed record is retried. Default 5000ms. */
    retryDelayMs?: number;
}

/**
 * Drains an outbox to a transport send function. Records are only removed
 * after `send()` resolves; failures are retried with a delay.
 */
export class OutboxDispatcher {
    private timer?: ReturnType<typeof setInterval>;
    private running?: Promise<number>;

    constructor(
        private readonly store: OutboxStore,
        private readonly send: (message: OutboxMessage) => Promise<void>,
        private readonly options: OutboxDispatcherOptions = {}
    ) { }

    start(): void {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.dispatchOnce().catch(() => undefined);
        }, this.options.intervalMs ?? 1_000);
        if (typeof (this.timer as any).unref === 'function') {
            (this.timer as any).unref();
        }
        void this.dispatchOnce().catch(() => undefined);
    }

    async stop(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        while (this.running) {
            await this.running.catch(() => undefined);
        }
    }

    /** Flush one batch; serialized so overlapping timers cannot double-send. */
    dispatchOnce(): Promise<number> {
        if (this.running) {
            return this.running;
        }
        this.running = this.flush().finally(() => {
            this.running = undefined;
        });
        return this.running;
    }

    private async flush(): Promise<number> {
        const batch = await this.store.claim(
            this.options.batchSize ?? 20,
            Date.now()
        );
        let sent = 0;
        for (const message of batch) {
            try {
                await this.send(message);
                await this.store.ack(message.id);
                sent += 1;
            } catch {
                await this.store.fail(
                    message.id,
                    Date.now() + (this.options.retryDelayMs ?? 5_000)
                );
            }
        }
        return sent;
    }
}
