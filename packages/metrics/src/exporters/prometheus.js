"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusExporter = void 0;
/**
 * Prometheus format exporter.
 * 将指标导出为 Prometheus 文本格式。
 */
class PrometheusExporter {
    /**
     * export metrics to Prometheus format.
     * @param metrics metric values.
     * @returns Prometheus formatted string.
     */
    export(metrics) {
        const lines = [];
        const seenMetrics = new Set();
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
            }
            else {
                lines.push(`${metric.name} ${metric.value}`);
            }
        }
        return lines.join('\n');
    }
    getPrometheusType(type) {
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
    formatLabels(labels) {
        if (!labels || Object.keys(labels).length === 0) {
            return '';
        }
        return Object.entries(labels)
            .map(([k, v]) => `${k}="${this.escapeLabelValue(v)}"`)
            .join(',');
    }
    escapeLabelValue(value) {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');
    }
}
exports.PrometheusExporter = PrometheusExporter;
//# sourceMappingURL=prometheus.js.map