import { Injectable } from '@tsdi/ioc';
import { ConsumerMetricLabels, ConsumerMetricsSink } from './metrics';
import { ConsumerIdempotencyOptions, ConsumerIdempotencyStore, MemoryIdempotencyStore } from './idempotency';

/**
 * Retry policy applied inside a consumer process.
 *
 * Transport-level redelivery (offset not committed, `nack(requeue)`, QoS
 * redelivery) still happens when `fail()` is chosen; this policy only avoids
 * paying a full reconnect/redelivery round trip for transient failures.
 */
export interface ConsumerRetryOptions {
    /**
     * retries after the first attempt. default 0.
     */
    maxAttempts?: number;
    /**
     * base backoff in milliseconds. default 0 (retry immediately).
     */
    delayMs?: number;
    /**
     * cap for exponential backoff. default `delayMs`.
     */
    maxDelayMs?: number;
}

export interface ConsumerRuntimeOptions {
    /**
     * maximum concurrent handlers. `<= 0` or omitted means unlimited.
     */
    concurrency?: number;
    retry?: ConsumerRetryOptions;
    /** Optional metrics sink (provided by `@tsdi/metrics`). */
    metrics?: ConsumerMetricsSink;
    /** Base labels for every delivery handled by this runtime. */
    labels?: ConsumerMetricLabels;
    /**
     * Deduplicate deliveries by `ConsumerMessage.id`. Opt-in: without a store
     * the runtime keeps at-least-once semantics (duplicates run again).
     */
    idempotency?: ConsumerIdempotencyOptions;
}

/**
 * One delivery handed to the runtime.
 *
 * `ack` settles the delivery after success, `fail` settles it after the retry
 * budget is exhausted (dead-letter, requeue, or throwing so the transport does
 * not commit). Transports decide what those primitives mean.
 */
export interface ConsumerMessage<T = unknown> {
    payload: T;
    /**
     * Stable identity for this delivery (e.g. Kafka `topic-partition-offset`,
     * AMQP `messageId`). Required for idempotent handling.
     */
    id?: string;
    /** Per-delivery metric labels such as `topic`. */
    labels?: ConsumerMetricLabels;
    ack?(): void | Promise<void>;
    /**
     * Settle a delivery that was skipped as a duplicate. Defaults to `ack`.
     * Transports whose success ack happens outside the runtime (AMQP transfer
     * hooks) implement this so a duplicate is still acknowledged.
     */
    skip?(): void | Promise<void>;
    fail?(error: unknown, attempts: number): void | Promise<void>;
}

export interface ConsumerStats {
    completed: number;
    failed: number;
    retried: number;
    duplicates: number;
    inFlight: number;
    peakInFlight: number;
}

/**
 * Shared consumer runtime: concurrency limiting, in-process retry/backoff,
 * idempotency and success/failure settlement.
 *
 * Broker servers only implement `ack`/`fail` and supply a stable `id` when the
 * protocol has one; `handle()` owns the per-message lifecycle so every
 * transport gets identical attempt accounting.
 */
@Injectable()
export class ConsumerRuntime {
    private active = 0;
    private waiters: Array<() => void> = [];
    private drainWaiters: Array<(drained: boolean) => void> = [];
    private closed = false;
    private idempotency?: { store: ConsumerIdempotencyStore; ttlMs: number };
    private state = { completed: 0, failed: 0, retried: 0, duplicates: 0, peakInFlight: 0 };

    constructor(private readonly options: ConsumerRuntimeOptions = {}) {
        if (options.idempotency) {
            this.idempotency = {
                store: options.idempotency.store ?? new MemoryIdempotencyStore(options.idempotency.maxEntries),
                ttlMs: Math.max(0, options.idempotency.ttlMs ?? 5 * 60_000)
            };
        }
    }

    get concurrency(): number {
        const value = this.options.concurrency;
        return value == null || value <= 0 ? Number.POSITIVE_INFINITY : value;
    }

    get inFlight(): number {
        return this.active;
    }

    get isClosed(): boolean {
        return this.closed;
    }

    stats(): ConsumerStats {
        return { ...this.state, inFlight: this.active };
    }

    /**
     * Stop accepting new deliveries. Already accepted (running or queued)
     * deliveries still complete; call `drain()` to wait for them.
     */
    close(): void {
        this.closed = true;
    }

    /**
     * Wait for running and queued deliveries to settle.
     *
     * @returns `true` when everything drained, `false` on timeout.
     */
    drain(timeoutMs = 30_000): Promise<boolean> {
        if (this.active === 0 && this.waiters.length === 0) {
            return Promise.resolve(true);
        }
        return new Promise<boolean>(resolve => {
            let settled = false;
            const finish = (drained: boolean) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                const index = this.drainWaiters.indexOf(finish);
                if (index >= 0) {
                    this.drainWaiters.splice(index, 1);
                }
                resolve(drained);
            };
            const timer = setTimeout(() => finish(false), Math.max(0, timeoutMs));
            if (typeof (timer as any).unref === 'function') {
                (timer as any).unref();
            }
            this.drainWaiters.push(finish);
        });
    }

    /**
     * Run `handler` for one delivery, retrying according to the configured
     * policy and settling it exactly once.
     *
     * When `idempotency` is configured and the delivery has an `id`, a
     * duplicate is acknowledged without running the handler.
     *
     * @returns `true` when handled (or deduplicated), `false` when the retry
     * budget was exhausted (the transport `fail()` decides whether that is a
     * dead-letter or a redelivery).
     */
    async handle<T>(message: ConsumerMessage<T>, handler: (message: ConsumerMessage<T>) => Promise<void>): Promise<boolean> {
        if (this.closed) {
            throw Object.assign(new Error('Consumer runtime is closed'), { code: 'CONSUMER_CLOSED' });
        }
        await this.acquire();
        const labels: ConsumerMetricLabels = { ...(this.options.labels ?? {}), ...(message.labels ?? {}) };
        const metrics = this.options.metrics;
        const key = this.idempotency && message.id ? message.id : undefined;
        let reserved = false;
        let handled = false;
        try {
            if (key) {
                reserved = await this.idempotency!.store.reserve(key, this.idempotency!.ttlMs);
                if (!reserved) {
                    this.state.duplicates++;
                    await (message.skip ?? message.ack)?.();
                    return true;
                }
            }

            const startedAt = Date.now();
            metrics?.started?.(labels);
            const maxAttempts = Math.max(this.options.retry?.maxAttempts ?? 0, 0);
            for (let attempt = 0; ; attempt++) {
                try {
                    await handler(message);
                    handled = true;
                    break;
                } catch (err) {
                    if (attempt >= maxAttempts) {
                        this.state.failed++;
                        metrics?.failed?.(labels);
                        await message.fail?.(err, attempt + 1);
                        return false;
                    }
                    this.state.retried++;
                    metrics?.retried?.(labels);
                    await this.delay(attempt + 1);
                }
            }

            // Ack outside the retry loop: a transport ack failure must not
            // re-run the business handler (which may already have committed).
            await message.ack?.();
            this.state.completed++;
            metrics?.completed?.(Date.now() - startedAt, labels);
            return true;
        } finally {
            if (key && reserved && !handled) {
                // Failed/threw: allow a redelivery to try again instead of
                // skipping it as a duplicate.
                try {
                    await this.idempotency!.store.release(key);
                } catch {
                    // best effort: a stale reservation only delays redelivery
                }
            }
            this.release();
        }
    }

    private acquire(): Promise<void> {
        if (this.active < this.concurrency) {
            this.active++;
            this.trackPeak();
            return Promise.resolve();
        }
        return new Promise<void>(resolve => {
            this.waiters.push(() => {
                // The slot is transferred from the releasing handler.
                this.trackPeak();
                resolve();
            });
        });
    }

    private release(): void {
        const next = this.waiters.shift();
        if (next) {
            next();
            return;
        }
        this.active--;
        if (this.active === 0 && this.waiters.length === 0 && this.drainWaiters.length) {
            const waiters = this.drainWaiters.splice(0, this.drainWaiters.length);
            for (const waiter of waiters) {
                waiter(true);
            }
        }
    }

    private trackPeak(): void {
        if (this.active > this.state.peakInFlight) {
            this.state.peakInFlight = this.active;
        }
    }

    private delay(attempt: number): Promise<void> {
        const base = Math.max(this.options.retry?.delayMs ?? 0, 0);
        if (base === 0) {
            return Promise.resolve();
        }
        const max = Math.max(this.options.retry?.maxDelayMs ?? base, base);
        const wait = Math.min(base * Math.pow(2, attempt - 1), max);
        return new Promise<void>(resolve => {
            const timer = setTimeout(resolve, wait);
            if (typeof (timer as any).unref === 'function') {
                (timer as any).unref();
            }
        });
    }
}
