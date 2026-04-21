import { Injectable } from '@tsdi/ioc';
import { Span } from '../tracing';
import { TraceExporter } from '../tracer';

/**
 * Console trace exporter.
 * 将 Span 输出到控制台，用于开发调试。
 */
@Injectable()
export class ConsoleTraceExporter implements TraceExporter {
    async export(spans: Span[]): Promise<void> {
        for (const span of spans) {
            console.log(JSON.stringify({
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                kind: span.kind,
                status: span.status,
                startTime: span.startTime,
                endTime: span.endTime,
                duration: span.duration,
                attributes: span.attributes,
                logs: span.logs
            }, null, 2));
        }
    }
}

/**
 * JSON trace exporter.
 * 将 Span 格式化为 JSON 输出。
 */
@Injectable()
export class JsonTraceExporter implements TraceExporter {
    private spans: Span[] = [];

    async export(spans: Span[]): Promise<void> {
        this.spans.push(...spans);
    }

    getSpans(): Span[] {
        return [...this.spans];
    }

    clear(): void {
        this.spans = [];
    }
}