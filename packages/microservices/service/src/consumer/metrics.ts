import { token } from '@tsdi/ioc';

/**
 * Labels attached to consumer metrics. Transports fill `transport`/`group`,
 * per-delivery handling adds `topic`.
 */
export interface ConsumerMetricLabels {
    transport?: string;
    group?: string;
    topic?: string;
    [key: string]: string | undefined;
}

/**
 * Structural metrics sink so `@tsdi/service` does not depend on
 * `@tsdi/metrics`. Brokers resolve the optional `CONSUMER_METRICS` token and
 * pass it to `ConsumerRuntime`.
 */
export interface ConsumerMetricsSink {
    started?(labels: ConsumerMetricLabels): void;
    completed?(durationMs: number, labels: ConsumerMetricLabels): void;
    failed?(labels: ConsumerMetricLabels): void;
    retried?(labels: ConsumerMetricLabels): void;
}

/**
 * Optional provider token implemented by `@tsdi/metrics`.
 */
export const CONSUMER_METRICS = token<ConsumerMetricsSink>('CONSUMER_METRICS');
