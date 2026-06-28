import expect = require('expect');
import { MetricsRegistry } from '../src/registry';
import { LatencyHistogram } from '../src/histograms/latency.histogram';

describe('LatencyHistogram', () => {
    it('registers http_request_duration_ms on construction', () => {
        const reg = new MetricsRegistry();
        const hist = new LatencyHistogram(reg);
        hist.recordLatency('GET', '/api', 200, 150);
        const metrics = reg.getMetrics();
        const countMetric = metrics.find(m => m.name === 'http_request_duration_ms_count');
        expect(countMetric).toBeDefined();
        expect(countMetric!.value).toBe(1);
    });

    it('recordLatency records timing with labels', () => {
        const reg = new MetricsRegistry();
        const hist = new LatencyHistogram(reg);
        hist.recordLatency('POST', '/users', 201, 42);
        const metrics = reg.getMetrics();
        const bucketMetric = metrics.find(m => m.name === 'http_request_duration_ms_bucket' && m.labels && m.labels.le === '50');
        expect(bucketMetric).toBeDefined();
        expect(bucketMetric!.value).toBe(1);
        const sumMetric = metrics.find(m => m.name === 'http_request_duration_ms_sum');
        expect(sumMetric!.value).toBe(42);
    });
});
