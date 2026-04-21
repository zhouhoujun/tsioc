import { MetricsRegistry, MetricsCollector, MetricValue, PrometheusExporter, MetricsModule, RequestCounter, ErrorCounter, LatencyHistogram } from '../src';
import expect = require('expect');

describe('Metrics Module Test', () => {

    describe('MetricsRegistry', () => {
        let registry: MetricsRegistry;

        beforeEach(() => {
            registry = new MetricsRegistry();
        });

        it('should increment counter', () => {
            registry.increment('test_counter', 1, { label: 'value' });
            const metrics = registry.getMetrics();
            expect(metrics.length).toBeGreaterThan(0);
            expect(metrics.find(m => m.name === 'test_counter')?.value).toBe(1);
        });

        it('should increment counter multiple times', () => {
            registry.increment('test_counter', 1);
            registry.increment('test_counter', 2);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'test_counter')?.value).toBe(3);
        });

        it('should set gauge value', () => {
            registry.gauge('test_gauge', 100);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'test_gauge')?.value).toBe(100);
        });

        it('should record histogram values', () => {
            registry.histogram('test_histogram', 50);
            registry.histogram('test_histogram', 150);
            const metrics = registry.getMetrics();
            // Histogram produces bucket values, sum, and count
            expect(metrics.filter(m => m.name.startsWith('test_histogram')).length).toBeGreaterThan(0);
        });

        it('should record timing as histogram', () => {
            registry.timing('request_duration', 100);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'request_duration_sum')?.value).toBe(100);
        });

        it('should reset metrics', () => {
            registry.increment('test_counter', 5);
            registry.reset('test_counter');
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'test_counter')).toBeUndefined();
        });

        it('should reset all metrics', () => {
            registry.increment('counter1', 1);
            registry.gauge('gauge1', 100);
            registry.reset();
            expect(registry.getMetrics().length).toBe(0);
        });

        it('should support prefix', () => {
            registry.setPrefix('myapp');
            registry.increment('requests', 1);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'myapp_requests')).toBeDefined();
        });

        it('should support default labels', () => {
            registry.setDefaultLabels({ service: 'test' });
            registry.increment('requests', 1);
            const metrics = registry.getMetrics();
            expect(metrics[0]?.labels?.service).toBe('test');
        });
    });

    describe('PrometheusExporter', () => {
        let exporter: PrometheusExporter;

        beforeEach(() => {
            exporter = new PrometheusExporter();
        });

        it('should export counter', () => {
            const metrics: MetricValue[] = [
                { name: 'test_counter', type: 'counter', value: 10, description: 'Test counter' }
            ];
            const output = exporter.export(metrics);
            expect(output).toContain('# HELP test_counter Test counter');
            expect(output).toContain('# TYPE test_counter counter');
            expect(output).toContain('test_counter 10');
        });

        it('should export gauge', () => {
            const metrics: MetricValue[] = [
                { name: 'test_gauge', type: 'gauge', value: 100 }
            ];
            const output = exporter.export(metrics);
            expect(output).toContain('# TYPE test_gauge gauge');
            expect(output).toContain('test_gauge 100');
        });

        it('should export histogram buckets', () => {
            const metrics: MetricValue[] = [
                { name: 'test_histogram_bucket', type: 'histogram', value: 5, labels: { le: '100' } },
                { name: 'test_histogram_sum', type: 'histogram', value: 500 },
                { name: 'test_histogram_count', type: 'histogram', value: 10 }
            ];
            const output = exporter.export(metrics);
            expect(output).toContain('test_histogram_bucket{le="100"} 5');
            expect(output).toContain('test_histogram_sum 500');
            expect(output).toContain('test_histogram_count 10');
        });

        it('should handle labels with special characters', () => {
            const metrics: MetricValue[] = [
                { name: 'test', type: 'counter', value: 1, labels: { path: '/api/users"test' } }
            ];
            const output = exporter.export(metrics);
            expect(output).toContain('path="/api/users\\"test"');
        });
    });

    describe('RequestCounter', () => {
        let registry: MetricsRegistry;
        let counter: RequestCounter;

        beforeEach(() => {
            registry = new MetricsRegistry();
            counter = new RequestCounter(registry);
        });

        it('should record request', () => {
            counter.recordRequest('GET', '/users');
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'http_requests_total')).toBeDefined();
        });

        it('should record response', () => {
            counter.recordResponse('GET', '/users', 200);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'http_responses_total')).toBeDefined();
        });
    });

    describe('ErrorCounter', () => {
        let registry: MetricsRegistry;
        let counter: ErrorCounter;

        beforeEach(() => {
            registry = new MetricsRegistry();
            counter = new ErrorCounter(registry);
        });

        it('should record error', () => {
            counter.recordError('GET', '/users', 500);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'http_errors_total')).toBeDefined();
        });

        it('should record exception', () => {
            counter.recordException('GET', '/users', 'NotFoundException');
            const metrics = registry.getMetrics();
            const errorMetric = metrics.find(m => m.name === 'http_errors_total');
            expect(errorMetric?.labels?.exception).toBe('NotFoundException');
        });
    });

    describe('LatencyHistogram', () => {
        let registry: MetricsRegistry;
        let histogram: LatencyHistogram;

        beforeEach(() => {
            registry = new MetricsRegistry();
            histogram = new LatencyHistogram(registry);
        });

        it('should record latency', () => {
            histogram.recordLatency('GET', '/users', 200, 50);
            const metrics = registry.getMetrics();
            expect(metrics.find(m => m.name === 'http_request_duration_ms_sum')?.value).toBe(50);
        });
    });

    describe('MetricsModule', () => {
        it('should have static withOptions method', () => {
            expect(MetricsModule.withOptions).toBeDefined();
            expect(typeof MetricsModule.withOptions).toBe('function');
        });

        it('should create ModuleWithProviders', () => {
            const result = MetricsModule.withOptions({ prefix: 'myapp' });
            expect(result.module).toBe(MetricsModule);
            expect(result.providers).toBeDefined();
        });
    });
});