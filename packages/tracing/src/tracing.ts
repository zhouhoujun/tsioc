/**
 * Span status.
 */
export type SpanStatus = 'UNSET' | 'OK' | 'ERROR';

/**
 * Span kind.
 */
export type SpanKind = 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';

/**
 * Trace context interface.
 */
export interface TraceContext {
    /**
     * trace id (unique across the entire trace).
     */
    traceId: string;
    /**
     * span id (unique within the trace).
     */
    spanId: string;
    /**
     * parent span id.
     */
    parentSpanId?: string;
    /**
     * trace flags (sampled, etc).
     */
    flags?: number;
}

/**
 * Span options.
 */
export interface SpanOptions {
    /**
     * span name.
     */
    name?: string;
    /**
     * span kind.
     */
    kind?: SpanKind;
    /**
     * parent span.
     */
    parent?: Span;
    /**
     * start timestamp.
     */
    startTime?: number;
    /**
     * span attributes.
     */
    attributes?: Record<string, any>;
}

/**
 * Span log entry.
 */
export interface SpanLog {
    /**
     * timestamp.
     */
    timestamp: number;
    /**
     * log fields.
     */
    fields: Record<string, any>;
}

/**
 * Span interface.
 */
export interface Span {
    /**
     * span id.
     */
    spanId: string;
    /**
     * trace id.
     */
    traceId: string;
    /**
     * parent span id.
     */
    parentSpanId?: string;
    /**
     * span name.
     */
    name: string;
    /**
     * span kind.
     */
    kind: SpanKind;
    /**
     * span status.
     */
    status: SpanStatus;
    /**
     * span start time.
     */
    startTime: number;
    /**
     * span end time.
     */
    endTime?: number;
    /**
     * span duration in milliseconds.
     */
    duration?: number;
    /**
     * span attributes.
     */
    attributes: Record<string, any>;
    /**
     * span logs.
     */
    logs: SpanLog[];
    /**
     * set span name.
     */
    setName(name: string): void;
    /**
     * set span status.
     */
    setStatus(status: SpanStatus): void;
    /**
     * set span attribute.
     */
    setAttribute(key: string, value: any): void;
    /**
     * add span log.
     */
    log(fields: Record<string, any>): void;
    /**
     * add error to span.
     */
    recordError(error: Error): void;
    /**
     * finish span.
     */
    finish(): void;
    /**
     * get trace context.
     */
    context(): TraceContext;
}

/**
 * Tracing options.
 */
export interface TracingOptions {
    /**
     * service name.
     */
    serviceName?: string;
    /**
     * sample rate (0-1).
     */
    sampleRate?: number;
    /**
     * enable tracing.
     */
    enabled?: boolean;
    /**
     * propagate trace context in headers.
     */
    propagateHeaders?: boolean;
    /**
     * trace header names.
     */
    headerNames?: {
        traceId?: string;
        spanId?: string;
        parentSpanId?: string;
        flags?: string;
    };
}