import { MetricValue } from '../metrics';
/**
 * Prometheus format exporter.
 * 将指标导出为 Prometheus 文本格式。
 */
export declare class PrometheusExporter {
    /**
     * export metrics to Prometheus format.
     * @param metrics metric values.
     * @returns Prometheus formatted string.
     */
    export(metrics: MetricValue[]): string;
    private getPrometheusType;
    private formatLabels;
    private escapeLabelValue;
}
