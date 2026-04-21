/**
 * Metric type enumeration.
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
/**
 * Metric value interface.
 */
export interface MetricValue {
    /**
     * metric name.
     */
    name: string;
    /**
     * metric type.
     */
    type: MetricType;
    /**
     * metric value.
     */
    value: number;
    /**
     * metric labels.
     */
    labels?: Record<string, string>;
    /**
     * metric timestamp.
     */
    timestamp?: number;
    /**
     * metric description.
     */
    description?: string;
}
/**
 * Base metric options.
 */
export interface MetricOptions {
    /**
     * metric name.
     */
    name: string;
    /**
     * metric description (HELP in Prometheus).
     */
    description?: string;
    /**
     * label names.
     */
    labels?: string[];
}
/**
 * Counter metric options.
 */
export interface CounterOptions extends MetricOptions {
}
/**
 * Gauge metric options.
 */
export interface GaugeOptions extends MetricOptions {
}
/**
 * Histogram metric options.
 */
export interface HistogramOptions extends MetricOptions {
    /**
     * histogram buckets.
     */
    buckets?: number[];
}
/**
 * Summary metric options.
 */
export interface SummaryOptions extends MetricOptions {
    /**
     * summary quantiles.
     */
    quantiles?: number[];
}
/**
 * Metrics module options.
 */
export interface MetricsModuleOptions {
    /**
     * metric name prefix.
     */
    prefix?: string;
    /**
     * default labels for all metrics.
     */
    defaultLabels?: Record<string, string>;
    /**
     * include memory metrics.
     */
    includeMemory?: boolean;
    /**
     * include request latency histogram.
     */
    includeLatency?: boolean;
    /**
     * latency histogram buckets in milliseconds.
     */
    latencyBuckets?: number[];
    /**
     * metrics endpoint path.
     */
    endpoint?: string;
}
