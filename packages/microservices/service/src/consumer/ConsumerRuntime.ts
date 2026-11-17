import { Injectable } from '@tsdi/ioc';
import { ConsumerMetricLabels, ConsumerMetricsSink } from './metrics';

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
    /** Per-delivery metric labels such as `topic`. */
    labels?: ConsumerMetricLabels;
    ack?(): void | Promise<void>;
    fail?(error: unknown, attempts: number): void | Promise<void>;
}

export interface ConsumerStats {
    completed: number;
    failed: number;
    retried: number;
    inFlight: number;
    peakInFlight: number;
}

/**
 * Shared consumer runtime: concurrency limiting, in-process retry/backoff and
 * success/failure settlement.
 *
 * Broker servers only implement `ack`/`fail`; `handle()` owns the per-message
 * lifecycle so every transport gets identical attempt accounting.
 */
@Injectable()
export class ConsumerRuntime {
    private active = 0;
    private waiters: Array<() => void> = [];
    private state = { completed: 0, failed: 0, retried: 0, peakInFlight: 0 };

    constructor(private readonly options: ConsumerRuntimeOptions = {}) { }

    get concurrency(): number {
        const value = this.options.concurrency;
        return value == null || value <= 0 ? Number.POSITIVE_INFINITY : value;
    }

    get inFlight(): number {
        return this.active;
    }

    stats(): ConsumerStats {
        return { ...this.state, inFlight: this.active };
    }

    /**
     * Run `handler` for one delivery, retrying according to the configured
     * policy and settling it exactly once.
     *
     * @returns `true` when handled, `false` when the retry budget was exhausted
     * (the transport `fail()` decides whether that is a dead-letter or a
     * redelivery).
     */
    async handle<T>(message: ConsumerMessage<T>, handler: (message: ConsumerMessage<T>) => Promise<void>): Promise<boolean> {
        await this.acquire();
        try {
            const maxAttempts = Math.max(this.options.retry?.maxAttempts ?? 0, 0);
            const labels: ConsumerMetricLabels = { ...(this.options.labels ?? {}), ...(message.labels ?? {}) };
            const metrics = this.options.metrics;
            const startedAt = Date.now();
            metrics?.started?.(labels);
            for (let attempt = 0; ; attempt++) {
                try {
                    await handler(message);
                    await message.ack?.();
                    this.state.completed++;
                    metrics?.completed?.(Date.now() - startedAt, labels);
                    return true;
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
        } finally {
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
