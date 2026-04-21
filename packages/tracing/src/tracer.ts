import { Abstract } from '@tsdi/ioc';
import { Span, SpanOptions, TraceContext } from './tracing';

/**
 * Trace exporter interface.
 */
export interface TraceExporter {
    /**
     * export spans.
     * @param spans spans to export.
     */
    export(spans: Span[]): Promise<void>;
}

/**
 * Tracer abstract interface.
 *
 * 分布式追踪器抽象接口，管理 Span 的创建和导出。
 */
@Abstract()
export abstract class Tracer {
    /**
     * service name.
     */
    abstract get serviceName(): string;

    /**
     * start a new span.
     * @param name span name.
     * @param options span options.
     */
    abstract startSpan(name: string, options?: SpanOptions): Span;

    /**
     * get current active span.
     */
    abstract getCurrentSpan(): Span | null;

    /**
     * set current span.
     * @param span span to set.
     */
    abstract setCurrentSpan(span: Span): void;

    /**
     * extract trace context from carrier (e.g., headers).
     * @param carrier carrier object.
     */
    abstract extractContext(carrier: Record<string, string>): TraceContext | null;

    /**
     * inject trace context into carrier.
     * @param context trace context.
     * @param carrier carrier object.
     */
    abstract injectContext(context: TraceContext, carrier: Record<string, string>): void;

    /**
     * add trace exporter.
     * @param exporter trace exporter.
     */
    abstract addExporter(exporter: TraceExporter): void;

    /**
     * flush pending spans.
     */
    abstract flush(): Promise<void>;

    /**
     * close tracer.
     */
    abstract close(): Promise<void>;
}