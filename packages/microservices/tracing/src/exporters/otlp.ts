import { Span } from '../tracing';
import { TraceExporter } from '../tracer';

export interface OtlpHttpTraceExporterOptions {
    /** OTLP/HTTP trace endpoint, e.g. `http://collector:4318/v1/traces`. */
    url: string;
    headers?: Record<string, string>;
    serviceName?: string;
    resourceAttributes?: Record<string, string>;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}

/**
 * OTLP/HTTP JSON trace exporter.
 */
export class OtlpHttpTraceExporter implements TraceExporter {
    constructor(private readonly options: OtlpHttpTraceExporterOptions) { }

    async export(spans: Span[]): Promise<void> {
        if (!spans.length) {
            return;
        }
        const fetchImpl = this.options.fetchImpl ?? fetch;
        const timeout = this.options.timeoutMs ?? 10_000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        (timer as any)?.unref?.();
        try {
            const response = await fetchImpl(this.options.url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(this.options.headers ?? {})
                },
                body: JSON.stringify(this.toPayload(spans)),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`OTLP trace export failed: ${response.status}`);
            }
        } finally {
            clearTimeout(timer);
        }
    }

    toPayload(spans: Span[]): Record<string, any> {
        return {
            resourceSpans: [{
                resource: {
                    attributes: toAttributes({
                        'service.name': this.options.serviceName ?? 'unknown',
                        ...(this.options.resourceAttributes ?? {})
                    })
                },
                scopeSpans: [{
                    scope: { name: '@tsdi/tracing' },
                    spans: spans.map(span => this.toOtlpSpan(span))
                }]
            }]
        };
    }

    private toOtlpSpan(span: Span): Record<string, any> {
        return {
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            name: span.name,
            kind: spanKind(span.kind),
            startTimeUnixNano: nanos(span.startTime),
            endTimeUnixNano: nanos(span.endTime ?? Date.now()),
            attributes: toAttributes(span.attributes),
            status: {
                code: span.status === 'OK' ? 1 : span.status === 'ERROR' ? 2 : 0
            },
            events: (span.logs ?? []).map(log => ({
                timeUnixNano: nanos(log.timestamp),
                name: 'log',
                attributes: toAttributes(log.fields)
            }))
        };
    }
}

function spanKind(kind: Span['kind']): number {
    switch (kind) {
        case 'SERVER': return 2;
        case 'CLIENT': return 3;
        case 'PRODUCER': return 4;
        case 'CONSUMER': return 5;
        default: return 1;
    }
}

function nanos(milliseconds: number): string {
    return String(Math.round(milliseconds * 1_000_000));
}

function toAttributes(attributes?: Record<string, any>): Array<{ key: string; value: any }> {
    return Object.entries(attributes ?? {})
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, value: toAttributeValue(value) }));
}

function toAttributeValue(value: any): any {
    if (typeof value === 'boolean') {
        return { boolValue: value };
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
    }
    if (value === null) {
        return { stringValue: 'null' };
    }
    return { stringValue: typeof value === 'string' ? value : JSON.stringify(value) };
}
