import { AgentTelemetry, AgentTelemetrySpan } from './AgentTelemetry';

/** Minimal subset of an OpenTelemetry tracer, kept dependency-free. */
export interface MinimalOtelSpan {
    setAttribute?(name: string, value: any): void;
    setStatus?(status: { code: number; message?: string }): void;
    recordException?(error: any): void;
    end?(): void;
}

export interface MinimalOtelTracer {
    startSpan(name: string, options?: { attributes?: Record<string, any> }): MinimalOtelSpan;
}

/**
 * Bridge telemetry spans to an OpenTelemetry tracer supplied by the host (for
 * example `trace.getTracer('tsdi-agent')`). The core never imports
 * `@opentelemetry/api`, so browser/web builds stay dependency-free.
 */
export class OpenTelemetryAgentTelemetry implements AgentTelemetry {
    constructor(private readonly tracer?: MinimalOtelTracer) {
    }

    startSpan(name: string, attributes?: Record<string, any>): AgentTelemetrySpan {
        const span = this.tracer?.startSpan(name, { attributes });
        return {
            end(status, extra) {
                if (!span) {
                    return;
                }
                Object.entries(extra ?? {}).forEach(([key, value]) => span.setAttribute?.(key, value));
                span.setStatus?.({ code: status === 'error' ? 2 : 1 });
                span.end?.();
            }
        };
    }
}
