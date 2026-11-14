/** Minimal telemetry contract; implementations may bridge to OTEL/metrics. */
export interface AgentTelemetrySpan {
    end(status?: 'ok' | 'error', attributes?: Record<string, any>): void;
}

export interface AgentTelemetry {
    startSpan(name: string, attributes?: Record<string, any>): AgentTelemetrySpan;
}

/** Default no-op implementation: no behaviour or allocation cost when unused. */
export class NoopAgentTelemetry implements AgentTelemetry {
    startSpan(): AgentTelemetrySpan {
        return { end() { /* noop */ } };
    }
}
