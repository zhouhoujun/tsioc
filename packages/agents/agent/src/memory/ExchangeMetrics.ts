import { Injectable } from '@tsdi/ioc';

/** Kinds of exchange events tracked by the metrics counter. */
export type ExchangeMetricKind = 'dropped' | 'stale' | 'duplicate' | 'unauthorized';

/** Immutable snapshot of exchange metrics counters. */
export interface ExchangeMetricsSnapshot {
    dropped: number;
    stale: number;
    duplicate: number;
    unauthorized: number;
}

/**
 * Aggregate counters for command exchange processing. Recorded by the durable
 * store (duplicate/stale) and the gateway surfaces (dropped/unauthorized),
 * exposed via RPC `command_exchange.metrics` and REST
 * `/api/command-exchange/metrics` for diagnostics and status display.
 */
@Injectable()
export class ExchangeMetrics {
    private counters: ExchangeMetricsSnapshot = { dropped: 0, stale: 0, duplicate: 0, unauthorized: 0 };

    record(kind: ExchangeMetricKind, n = 1): void {
        this.counters[kind] += n;
    }

    snapshot(): ExchangeMetricsSnapshot {
        return { ...this.counters };
    }

    reset(): void {
        this.counters = { dropped: 0, stale: 0, duplicate: 0, unauthorized: 0 };
    }
}