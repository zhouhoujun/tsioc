import { Injectable } from '@tsdi/ioc';
import { ConsumerMetricLabels, ConsumerMetricsSink } from '@tsdi/service';
import { MetricsCollector } from '../collector';
import { recordDuration } from '../timing';

/**
 * Metrics adapter for `ConsumerRuntime`.
 *
 * Registered under the `CONSUMER_METRICS` token by `useMetrics` /
 * `MetricsModule`; broker servers resolve it optionally and hand it to the
 * shared consumer runtime.
 */
@Injectable()
export class ConsumerMetricsRecorder implements ConsumerMetricsSink {
    private readonly inFlight = new Map<string, number>();

    constructor(private readonly collector: MetricsCollector) {
        this.collector.register({
            name: 'consumer_messages_started_total',
            description: 'Broker deliveries started'
        });
        this.collector.register({
            name: 'consumer_messages_completed_total',
            description: 'Broker deliveries handled successfully'
        });
        this.collector.register({
            name: 'consumer_messages_failed_total',
            description: 'Broker deliveries that exhausted retries'
        });
        this.collector.register({
            name: 'consumer_messages_retried_total',
            description: 'In-process consumer retry attempts'
        });
        this.collector.register({
            name: 'consumer_inflight',
            description: 'Consumer deliveries currently being handled'
        });
        this.collector.register({
            name: 'consumer_message_duration_ms',
            description: 'Consumer handler duration in milliseconds'
        });
    }

    started(labels: ConsumerMetricLabels): void {
        const cleaned = this.clean(labels);
        this.collector.increment('consumer_messages_started_total', 1, cleaned);
        this.changeInFlight(cleaned, 1);
    }

    completed(durationMs: number, labels: ConsumerMetricLabels): void {
        const cleaned = this.clean(labels);
        this.collector.increment('consumer_messages_completed_total', 1, cleaned);
        recordDuration(this.collector, 'consumer_message_duration_ms', durationMs, cleaned);
        this.changeInFlight(cleaned, -1);
    }

    failed(labels: ConsumerMetricLabels): void {
        const cleaned = this.clean(labels);
        this.collector.increment('consumer_messages_failed_total', 1, cleaned);
        this.changeInFlight(cleaned, -1);
    }

    retried(labels: ConsumerMetricLabels): void {
        this.collector.increment('consumer_messages_retried_total', 1, this.clean(labels));
    }

    private changeInFlight(labels: Record<string, string>, delta: number): void {
        const key = JSON.stringify(labels);
        const value = Math.max(0, (this.inFlight.get(key) ?? 0) + delta);
        this.inFlight.set(key, value);
        this.collector.gauge('consumer_inflight', value, labels);
    }

    private clean(labels: ConsumerMetricLabels): Record<string, string> {
        const cleaned: Record<string, string> = {};
        Object.keys(labels).sort().forEach(key => {
            const value = labels[key];
            if (value !== undefined) {
                cleaned[key] = String(value);
            }
        });
        return cleaned;
    }
}
