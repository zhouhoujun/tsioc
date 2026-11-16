import { Inject, Injectable, OnDestroy } from '@tsdi/ioc';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as crypto from 'node:crypto';
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
    flags = 1;
    startTime: number;
    endTime?: number;
    duration?: number;
    attributes: Record<string, any> = {};
    logs: SpanLog[] = [];
    private finished = false;
    private tracer: DefaultTracer;

    constructor(tracer: DefaultTracer, name: string, options: SpanOptions = {}) {
        this.tracer = tracer;
        this.spanId = DefaultSpan.generateId(8);
        this.traceId = options.parent?.traceId ?? DefaultSpan.generateId(16);
        this.parentSpanId = options.parent?.spanId;
        this.flags = (options.parent as TraceContext | undefined)?.flags ?? 1;
        this.name = name;
        this.kind = options.kind ?? 'INTERNAL';
        this.startTime = options.startTime ?? Date.now();
        this.attributes = options.attributes ?? {};
    }

    private static generateId(bytes: number): string {
        return crypto.randomBytes(bytes).toString('hex');
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
            flags: this.flags
        };
    }
}

/**
 * Default tracer implementation.
 */
@Injectable()
export class DefaultTracer extends Tracer implements OnDestroy {
    private readonly storage = new AsyncLocalStorage<Span | null>();
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
        const parentFlags = options.parent && typeof options.parent === 'object' && 'flags' in options.parent
            ? (options.parent as TraceContext).flags
            : undefined;
        if (!this.enabled || parentFlags === 0 || (parentFlags == null && Math.random() > this.sampleRate)) {
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
            parent: options.parent ?? this.getCurrentSpan() ?? undefined
        });
        return span;
    }

    /**
     * Run `fn` inside an isolated `AsyncLocalStorage` scope.
     *
     * `startSpan()` deliberately does not activate spans: two concurrent
     * operations started in the same async context would otherwise parent the
     * second span to the first one.
     */
    runWithSpan<T>(span: Span, fn: () => T): T {
        return this.storage.run(span, fn);
    }

    getCurrentSpan(): Span | null {
        return this.storage.getStore() ?? null;
    }

    setCurrentSpan(span: Span): void {
        this.storage.enterWith(span);
    }

    extractContext(carrier: Record<string, string>): TraceContext | null {
        const traceparent = carrier['traceparent'];
        if (traceparent) {
            const parsed = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i.exec(traceparent.trim());
            if (parsed && parsed[1] !== 'ff') {
                return {
                    traceId: parsed[2].toLowerCase(),
                    spanId: parsed[3].toLowerCase(),
                    flags: parseInt(parsed[4], 16)
                };
            }
        }
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
        if (context.traceId && context.spanId) {
            const flags = (context.flags ?? 1).toString(16).padStart(2, '0');
            carrier.traceparent = `00-${context.traceId}-${context.spanId}-${flags}`;
        }
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