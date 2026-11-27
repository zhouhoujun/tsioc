import expect = require('expect');
import { OtlpHttpTraceExporter } from '../src/exporters/otlp';
import { Span } from '../src/tracing';

const describeLive = process.env.TSIO_TEST_OTLP === '1'
    ? describe
    : ((_name: string, _fn: () => void) => undefined) as unknown as typeof describe;

function span(): Span {
    return {
        traceId: 'a'.repeat(32),
        spanId: 'b'.repeat(16),
        name: 'GET /live',
        kind: 'SERVER',
        status: 'OK',
        startTime: Date.now(),
        endTime: Date.now() + 1,
        duration: 1,
        attributes: { 'http.request.method': 'GET' },
        logs: [],
        finish: () => undefined,
        setName: () => undefined,
        setStatus: () => undefined,
        setAttribute: () => undefined,
        log: () => undefined,
        recordError: () => undefined,
        context: () => ({ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) })
    } as Span;
}

describeLive('OTLP live collector (tracing)', () => {
    it('exports a span to the configured collector', async () => {
        const exporter = new OtlpHttpTraceExporter({
            url: process.env.OTEL_EXPORTER_OTLP_TRACES_URL ?? 'http://127.0.0.1:4318/v1/traces',
            serviceName: 'tsdi-live-test',
            timeoutMs: 5000
        });
        await expect(exporter.export([span()])).resolves.toBeUndefined();
    });
});
