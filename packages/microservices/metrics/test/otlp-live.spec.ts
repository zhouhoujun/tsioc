import expect = require('expect');
import { OtlpHttpMetricsExporter } from '../src/exporters/otlp';
import { MetricsRegistry } from '../src/registry';

const describeLive = process.env.TSIO_TEST_OTLP === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

describeLive('OTLP live collector (metrics)', () => {
    it('exports counters and histograms to the configured collector', async () => {
        const registry = new MetricsRegistry();
        registry.increment('live_requests_total', 1, { route: '/live' });
        registry.timing('live_duration_ms', 12, { route: '/live' });
        const exporter = new OtlpHttpMetricsExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_URL ?? 'http://127.0.0.1:4318/v1/metrics',
            serviceName: 'tsdi-live-test',
            timeoutMs: 5000
        });
        await expect(exporter.export(registry.getMetrics())).resolves.toBeUndefined();
    });
});
