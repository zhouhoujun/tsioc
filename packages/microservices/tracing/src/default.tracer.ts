import { Inject, Injectable, OnDestroy } from '@tsdi/ioc';
import { Span, SpanOptions, SpanStatus, SpanKind, SpanLog, TraceContext, TracingOptions } from './tracing';
import { Tracer, TraceExporter } from './tracer';
import { TRACE_EXPORTERS, TRACING_OPTIONS } from './tokens';

/**
 * Default span implementation.
 */
export class DefaultSpan implements Span {
    spanId: string;
    traceId: string;
    parentSpanId?: string;
    name: string;
    kind: SpanKind;
    status: SpanStatus = 'UNSET';
    startTime: number;
    endTime?: number;
    duration?: number;
    attributes: Record<string, any> = {};
    logs: SpanLog[] = [];
    private finished = false;
    private tracer: DefaultTracer;

    constructor(tracer: DefaultTracer, name: string, options: SpanOptions = {}) {
        this.tracer = tracer;
        this.spanId = this.generateId();
        this.traceId = options.parent?.traceId ?? this.generateId();
        this.parentSpanId = options.parent?.spanId ?? options.parent?.parentSpanId;
        this.name = name;
        this.kind = options.kind ?? 'INTERNAL';
        this.startTime = options.startTime ?? Date.now();
        this.attributes = options.attributes ?? {};
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 16);
    }

    setName(name: string): void {
        if (!this.finished) {
            this.name = name;
        }
    }

    setStatus(status: SpanStatus): void {
        if (!this.finished) {
            this.status = status;
        }
    }

    setAttribute(key: string, value: any): void {
        if (!this.finished) {
            this.attributes[key] = value;
        }
    }

    log(fields: Record<string, any>): void {
        if (!this.finished) {
            this.logs.push({
                timestamp: Date.now(),
                fields
            });
        }
    }

    recordError(error: Error): void {
        if (!this.finished) {
            this.setStatus('ERROR');
            this.log({
                'error.type': error.name,
                'error.message': error.message,
                'error.stack': error.stack
            });
        }
    }

    finish(): void {
        if (!this.finished) {
            this.finished = true;
            this.endTime = Date.now();
            this.duration = this.endTime - this.startTime;
            this.tracer.onSpanFinished(this);
        }
    }

    context(): TraceContext {
        return {
            traceId: this.traceId,
            spanId: this.spanId,
            parentSpanId: this.parentSpanId,
            flags: 1 // sampled
        };
    }
}

/**
 * Default tracer implementation.
 */
@Injectable()
export class DefaultTracer extends Tracer implements OnDestroy {
    private currentSpan: Span | null = null;
    private pendingSpans: Span[] = [];
    private exporters: TraceExporter[] = [];
    private flushTimer?: ReturnType<typeof setInterval>;
    private enabled: boolean;
    private sampleRate: number;
    private flushIntervalMs: number;

    constructor(
        @Inject(TRACING_OPTIONS, { nullable: true }) options?: TracingOptions,
        @Inject(TRACE_EXPORTERS, { nullable: true }) exporters?: TraceExporter[]
    ) {
        super();
        const opts = options ?? {};
        this._serviceName = opts.serviceName ?? 'unknown';
        this.enabled = opts.enabled ?? true;
        this.sampleRate = opts.sampleRate ?? 1;
        this.flushIntervalMs = opts.flushIntervalMs ?? 5000;

        if (opts.propagateHeaders) {
            this._headerNames = {
                traceId: opts.headerNames?.traceId ?? 'x-trace-id',
                spanId: opts.headerNames?.spanId ?? 'x-span-id',
                parentSpanId: opts.headerNames?.parentSpanId ?? 'x-parent-span-id',
                flags: opts.headerNames?.flags ?? 'x-trace-flags'
            };
        } else {
            this._headerNames = {
                traceId: 'x-trace-id',
                spanId: 'x-span-id',
                parentSpanId: 'x-parent-span-id',
                flags: 'x-trace-flags'
            };
        }

        if (exporters?.length) {
            this.exporters.push(...exporters);
        }

        // Periodic flush. Unref so tracing never keeps the process alive.
        if (this.flushIntervalMs > 0) {
            const timer = setInterval(() => this.flush(), this.flushIntervalMs) as any;
            timer?.unref?.();
            this.flushTimer = timer;
        }
    }

    private _serviceName: string;
    get serviceName(): string {
        return this._serviceName;
    }

    private _headerNames: Record<string, string>;
    get headerNames(): Record<string, string> {
        return this._headerNames;
    }

    startSpan(name: string, options: SpanOptions = {}): Span {
        if (!this.enabled || Math.random() > this.sampleRate) {
            // Return a no-op span
            const noopSpan: Span = {
                spanId: '',
                traceId: '',
                parentSpanId: undefined,
                name: name,
                kind: 'INTERNAL',
                status: 'UNSET',
                startTime: Date.now(),
                endTime: undefined,
                duration: undefined,
                attributes: {},
                logs: [],
                finish: () => {},
                setName: () => {},
                setStatus: () => {},
                setAttribute: () => {},
                log: () => {},
                recordError: () => {},
                context: () => ({ traceId: '', spanId: '' })
            };
            return noopSpan;
        }

        const span = new DefaultSpan(this, name, {
            ...options,
            parent: options.parent ?? (this.currentSpan as Span | undefined)
        });
        this.setCurrentSpan(span);
        return span;
    }

    getCurrentSpan(): Span | null {
        return this.currentSpan;
    }

    setCurrentSpan(span: Span): void {
        this.currentSpan = span;
    }

    extractContext(carrier: Record<string, string>): TraceContext | null {
        const traceId = carrier[this._headerNames.traceId];
        const spanId = carrier[this._headerNames.spanId];
        const parentSpanId = carrier[this._headerNames.parentSpanId];
        const flags = carrier[this._headerNames.flags];

        if (traceId && spanId) {
            return {
                traceId,
                spanId,
                parentSpanId,
                flags: flags ? parseInt(flags) : undefined
            };
        }
        return null;
    }

    injectContext(context: TraceContext, carrier: Record<string, string>): void {
        carrier[this._headerNames.traceId] = context.traceId;
        carrier[this._headerNames.spanId] = context.spanId;
        if (context.parentSpanId) {
            carrier[this._headerNames.parentSpanId] = context.parentSpanId;
        }
        if (context.flags) {
            carrier[this._headerNames.flags] = String(context.flags);
        }
    }

    addExporter(exporter: TraceExporter): void {
        this.exporters.push(exporter);
    }

    onSpanFinished(span: Span): void {
        this.pendingSpans.push(span);
        if (this.pendingSpans.length >= 100) {
            this.flush();
        }
    }

    async flush(): Promise<void> {
        if (this.pendingSpans.length === 0) return;

        const spans = [...this.pendingSpans];
        this.pendingSpans = [];

        for (const exporter of this.exporters) {
            try {
                await exporter.export(spans);
            } catch (err) {
                // Ignore export errors
            }
        }
    }

    async close(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        await this.flush();
        this.exporters = [];
    }

    onDestroy(): void {
        this.close();
    }
}