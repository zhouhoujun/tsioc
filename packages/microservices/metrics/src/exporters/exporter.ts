import { MetricValue } from '../metrics';

/**
 * Metrics exporter abstraction. Implementations can push to Prometheus,
 * OTLP/HTTP, a local file, etc.
 */
export interface MetricsExporter {
    /**
     * export a metrics snapshot.
     */
    export(metrics: MetricValue[]): string | void | Promise<void>;
}
