import { MetricsCollector } from './collector';
/**
 * Metrics controller.
 * 提供 /metrics 端点，输出 Prometheus 格式的指标。
 */
export declare class MetricsController {
    private collector;
    private exporter;
    constructor(collector: MetricsCollector);
    /**
     * get metrics in Prometheus format.
     * @returns Prometheus formatted metrics.
     */
    metrics(): string;
    /**
     * get metrics in JSON format.
     * @returns JSON formatted metrics.
     */
    metricsJson(): {
        metrics: ReturnType<MetricsCollector['getMetrics']>;
    };
}
