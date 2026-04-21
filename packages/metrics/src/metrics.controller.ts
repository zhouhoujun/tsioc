import { Controller, Get } from '@tsdi/endpoints';
import { Injectable } from '@tsdi/ioc';
import { MetricsCollector } from './collector';
import { PrometheusExporter } from './exporters/prometheus';

/**
 * Metrics controller.
 * 提供 /metrics 端点，输出 Prometheus 格式的指标。
 */
@Controller('/metrics')
@Injectable()
export class MetricsController {
    private exporter: PrometheusExporter;

    constructor(private collector: MetricsCollector) {
        this.exporter = new PrometheusExporter();
    }

    /**
     * get metrics in Prometheus format.
     * @returns Prometheus formatted metrics.
     */
    @Get()
    metrics(): string {
        const metrics = this.collector.getMetrics();
        return this.exporter.export(metrics);
    }

    /**
     * get metrics in JSON format.
     * @returns JSON formatted metrics.
     */
    @Get('/json')
    metricsJson(): { metrics: ReturnType<MetricsCollector['getMetrics']> } {
        return {
            metrics: this.collector.getMetrics()
        };
    }
}