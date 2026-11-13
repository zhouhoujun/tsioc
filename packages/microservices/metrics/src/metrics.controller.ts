import { Controller, Get } from '@tsdi/service';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { RestfulRequestAdapter } from '@tsdi/common';
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
    @Get('/')
    metrics(@Optional() @Inject(RestfulRequestAdapter) adapter?: RestfulRequestAdapter): string {
        adapter?.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
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