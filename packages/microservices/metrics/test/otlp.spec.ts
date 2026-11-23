import expect = require('expect');
import { MetricValue } from '../src/metrics';
import { OtlpHttpMetricsExporter } from '../src/exporters/otlp';

describe('OtlpHttpMetricsExporter', () => {
    const metrics: MetricValue[] = [
        { name: 'http_requests_total', type: 'counter', value: 3, labels: { method: 'GET' }, description: 'requests' },
        { name: 'http_request_duration_ms_bucket', type: 'histogram', value: 1, labels: { le: '10' } },
        { name: 'http_request_duration_ms_bucket', type: 'histogram', value: 3, labels: { le: '100' } },
        { name: 'http_request_duration_ms_bucket', type: 'histogram', value: 4, labels: { le: '+Inf' } },
        { name: 'http_request_duration_ms_sum', type: 'histogram', value: 250, labels: {} },
        { name: 'http_request_duration_ms_count', type: 'histogram', value: 4, labels: {} }
    ];

    it('builds OTLP counters, gauges and histograms', () => {
        const exporter = new OtlpHttpMetricsExporter({
            url: 'http://collector:4318/v1/metrics',
            serviceName: 'users-service'
        });
        const payload = exporter.toPayload(metrics);

        const resourceMetrics = payload.resourceMetrics[0];
        expect(resourceMetrics.resource.attributes).toContainEqual({
            key: 'service.name',
            value: { stringValue: 'users-service' }
        });

        const otlpMetrics = resourceMetrics.scopeMetrics[0].metrics;
        const counter = otlpMetrics.find((metric: any) => metric.name === 'http_requests_total');
        expect(counter.sum.isMonotonic).toBe(true);
        expect(counter.sum.dataPoints[0].asDouble).toBe(3);
        expect(counter.sum.dataPoints[0].attributes).toContainEqual({
            key: 'method',
            value: { stringValue: 'GET' }
        });

        const histogram = otlpMetrics.find((metric: any) => metric.name === 'http_request_duration_ms');
        expect(histogram.histogram.dataPoints[0].count).toBe(4);
        expect(histogram.histogram.dataPoints[0].sum).toBe(250);
        expect(histogram.histogram.dataPoints[0].explicitBounds).toEqual([10, 100]);
        // cumulative buckets 1, 3, 4 -> per-bucket 1, 2, 1
        expect(histogram.histogram.dataPoints[0].bucketCounts).toEqual([1, 2, 1]);
    });

    it('infers OTLP units from metric names', () => {
        const exporter = new OtlpHttpMetricsExporter({ url: 'http://collector:4318/v1/metrics' });
        const payload = exporter.toPayload([
            { name: 'http_request_duration_seconds_bucket', type: 'histogram', value: 2, labels: { le: '1' } },
            { name: 'http_request_duration_seconds_bucket', type: 'histogram', value: 3, labels: { le: '+Inf' } },
            { name: 'http_request_duration_seconds_sum', type: 'histogram', value: 4.5, labels: {} },
            { name: 'http_request_duration_seconds_count', type: 'histogram', value: 3, labels: {} },
            { name: 'process_heap_bytes', type: 'gauge', value: 1024 }
        ]);

        const otlpMetrics = payload.resourceMetrics[0].scopeMetrics[0].metrics;
        const seconds = otlpMetrics.find((metric: any) => metric.name === 'http_request_duration_seconds');
        expect(seconds.unit).toBe('s');
        expect(seconds.histogram.dataPoints[0].explicitBounds).toEqual([1]);
        expect(otlpMetrics.find((metric: any) => metric.name === 'process_heap_bytes').unit).toBe('By');
    });

    it('posts the payload to the OTLP endpoint', async () => {
        let captured: any;
        const exporter = new OtlpHttpMetricsExporter({
            url: 'http://collector:4318/v1/metrics',
            serviceName: 'users-service',
            headers: { 'x-tenant': 'acme' },
            fetchImpl: (async (url: any, init: any) => {
                captured = { url, init };
                return { ok: true, status: 200 } as any;
            }) as any
        });

        await exporter.export(metrics);
        expect(captured.url).toBe('http://collector:4318/v1/metrics');
        expect(captured.init.headers['content-type']).toBe('application/json');
        expect(captured.init.headers['x-tenant']).toBe('acme');
        expect(JSON.parse(captured.init.body).resourceMetrics.length).toBe(1);
    });

    it('throws when the collector rejects the payload', async () => {
        const exporter = new OtlpHttpMetricsExporter({
            url: 'http://collector:4318/v1/metrics',
            fetchImpl: (async () => ({ ok: false, status: 503 })) as any
        });
        await expect(exporter.export(metrics)).rejects.toThrow('OTLP metrics export failed: 503');
    });
});
