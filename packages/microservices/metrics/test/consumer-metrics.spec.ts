import expect = require('expect');
import { ConsumerMetricsRecorder } from '../src/counters/consumer-metrics.recorder';

describe('ConsumerMetricsRecorder', () => {
    function createCollector() {
        const registered: string[] = [];
        const increments: Array<{ name: string; value: number; labels?: any }> = [];
        const gauges: Array<{ name: string; value: number; labels?: any }> = [];
        const timings: Array<{ name: string; value: number; labels?: any }> = [];
        return {
            registered,
            increments,
            gauges,
            timings,
            register(options: { name: string }) { registered.push(options.name); },
            increment(name: string, value: number, labels?: any) { increments.push({ name, value, labels }); },
            gauge(name: string, value: number, labels?: any) { gauges.push({ name, value, labels }); },
            timing(name: string, value: number, labels?: any) { timings.push({ name, value, labels }); }
        } as any;
    }

    it('registers consumer metric names', () => {
        const collector = createCollector();
        new ConsumerMetricsRecorder(collector);
        expect(collector.registered).toEqual([
            'consumer_messages_started_total',
            'consumer_messages_completed_total',
            'consumer_messages_failed_total',
            'consumer_messages_retried_total',
            'consumer_inflight',
            'consumer_message_duration_ms'
        ]);
    });

    it('tracks in-flight deliveries per label set', () => {
        const collector = createCollector();
        const recorder = new ConsumerMetricsRecorder(collector);
        const labels = { transport: 'kafka', topic: 'orders' };

        recorder.started(labels);
        recorder.started(labels);
        expect(collector.gauges).toEqual([
            { name: 'consumer_inflight', value: 1, labels },
            { name: 'consumer_inflight', value: 2, labels }
        ]);

        recorder.completed(12, labels);
        recorder.failed(labels);
        expect(collector.gauges.slice(-2)).toEqual([
            { name: 'consumer_inflight', value: 1, labels },
            { name: 'consumer_inflight', value: 0, labels }
        ]);
        expect(collector.increments.map((entry: any) => entry.name)).toEqual([
            'consumer_messages_started_total',
            'consumer_messages_started_total',
            'consumer_messages_completed_total',
            'consumer_messages_failed_total'
        ]);
        expect(collector.timings.map((entry: any) => entry.name)).toEqual([
            'consumer_message_duration_ms',
            'consumer_message_duration_seconds'
        ]);
        expect(collector.timings[1].value).toBe(0.012);
    });

    it('counts retries and drops undefined labels', () => {
        const collector = createCollector();
        const recorder = new ConsumerMetricsRecorder(collector);
        recorder.retried({ transport: 'nats', topic: undefined as any, group: 'g1' });

        expect(collector.increments[0].name).toBe('consumer_messages_retried_total');
        expect(collector.increments[0].labels).toEqual({ group: 'g1', transport: 'nats' });
    });
});
