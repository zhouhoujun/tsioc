import { MetricValue } from '../metrics';

/**
 * Prometheus format exporter.
 * 将指标导出为 Prometheus 文本格式。
 */
export class PrometheusExporter {
    /**
     * export metrics to Prometheus format.
     * @param metrics metric values.
     * @returns Prometheus formatted string.
     */
    export(metrics: MetricValue[]): string {
        const lines: string[] = [];
        const seenMetrics = new Set<string>();

        for (const metric of metrics) {
            const baseName = metric.name.replace(/_bucket$|_sum$|_count$/, '');

            // Add HELP and TYPE header (only once per metric)
            if (!seenMetrics.has(baseName)) {
                seenMetrics.add(baseName);
                if (metric.description) {
                    lines.push(`# HELP ${baseName} ${metric.description}`);
                }
                lines.push(`# TYPE ${baseName} ${this.getPrometheusType(metric.type)}`);
            }

            // Add metric value
            const labelsStr = this.formatLabels(metric.labels);
            if (labelsStr) {
                lines.push(`${metric.name}{${labelsStr}} ${metric.value}`);
            } else {
                lines.push(`${metric.name} ${metric.value}`);
            }
        }

        return lines.join('\n');
    }

    private getPrometheusType(type: string): string {
        switch (type) {
            case 'counter':
                return 'counter';
            case 'gauge':
                return 'gauge';
            case 'histogram':
                return 'histogram';
            case 'summary':
                return 'summary';
            default:
                return 'untyped';
        }
    }

    private formatLabels(labels?: Record<string, string>): string {
        if (!labels || Object.keys(labels).length === 0) {
            return '';
        }
        return Object.entries(labels)
            .map(([k, v]) => `${k}="${this.escapeLabelValue(v)}"`)
            .join(',');
    }

    private escapeLabelValue(value: string): string {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
    }
}