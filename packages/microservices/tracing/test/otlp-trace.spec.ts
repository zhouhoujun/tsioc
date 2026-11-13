import expect = require('expect');
import { OtlpHttpTraceExporter } from '../src/exporters/otlp';
import { Span } from '../src/tracing';

function sampleSpan(): Span {
    return {
        traceId: 'a'.repeat(32),
        spanId: 'b'.repeat(16),
        parentSpanId: 'c'.repeat(16),
        name: 'GET /users',
        kind: 'SERVER',
        status: 'ERROR',
        startTime: 1_000,
        endTime: 1_010,
        duration: 10,
        attributes: {
            'http.method': 'GET',
            'http.status_code': 500,
            sampled: true
        },
        logs: [{ timestamp: 1_005, fields: { message: 'boom' } }],
        finish: () => undefined,
        setName: () => undefined,
        setStatus: () => undefined,
        setAttribute: () => undefined,
        log: () => undefined,
        recordError: () => undefined,
        context: () => ({ traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) })
    } as Span;
}

describe('OtlpHttpTraceExporter', () => {
    it('builds an OTLP/HTTP trace payload', () => {
        const exporter = new OtlpHttpTraceExporter({
            url: 'http://collector:4318/v1/traces',
            serviceName: 'users-service',
            resourceAttributes: { env: 'test' }
        });
        const payload = exporter.toPayload([sampleSpan()]);
        const resourceSpans = payload.resourceSpans[0];
        expect(resourceSpans.resource.attributes).toContainEqual({
            key: 'service.name',
            value: { stringValue: 'users-service' }
        });
        expect(resourceSpans.resource.attributes).toContainEqual({
            key: 'env',
            value: { stringValue: 'test' }
        });

        const span = resourceSpans.scopeSpans[0].spans[0];
        expect(span.traceId).toBe('a'.repeat(32));
        expect(span.parentSpanId).toBe('c'.repeat(16));
        expect(span.kind).toBe(2);
        expect(span.status.code).toBe(2);
        expect(span.startTimeUnixNano).toBe('1000000000');
        expect(span.attributes).toContainEqual({
            key: 'http.status_code',
            value: { intValue: '500' }
        });
        expect(span.attributes).toContainEqual({
            key: 'sampled',
            value: { boolValue: true }
        });
        expect(span.events[0].attributes).toContainEqual({
            key: 'message',
            value: { stringValue: 'boom' }
        });
    });

    it('posts the payload to the OTLP endpoint', async () => {
        let captured: any;
        const exporter = new OtlpHttpTraceExporter({
            url: 'http://collector:4318/v1/traces',
            serviceName: 'users-service',
            headers: { 'x-tenant': 'acme' },
            fetchImpl: (async (url: any, init: any) => {
                captured = { url, init };
                return { ok: true, status: 200 } as any;
            }) as any
        });
        await exporter.export([sampleSpan()]);
        expect(captured.url).toBe('http://collector:4318/v1/traces');
        expect(captured.init.headers['x-tenant']).toBe('acme');
        expect(JSON.parse(captured.init.body).resourceSpans.length).toBe(1);
    });

    it('throws when the collector rejects spans', async () => {
        const exporter = new OtlpHttpTraceExporter({
            url: 'http://collector:4318/v1/traces',
            fetchImpl: (async () => ({ ok: false, status: 503 })) as any
        });
        await expect(exporter.export([sampleSpan()])).rejects.toThrow('OTLP trace export failed: 503');
    });
});
