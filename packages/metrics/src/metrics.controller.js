"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsController = void 0;
const tslib_1 = require("tslib");
const endpoints_1 = require("@tsdi/endpoints");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("./collector");
const prometheus_1 = require("./exporters/prometheus");
/**
 * Metrics controller.
 * 提供 /metrics 端点，输出 Prometheus 格式的指标。
 */
let MetricsController = class MetricsController {
    constructor(collector) {
        this.collector = collector;
        this.exporter = new prometheus_1.PrometheusExporter();
    }
    /**
     * get metrics in Prometheus format.
     * @returns Prometheus formatted metrics.
     */
    metrics() {
        const metrics = this.collector.getMetrics();
        return this.exporter.export(metrics);
    }
    /**
     * get metrics in JSON format.
     * @returns JSON formatted metrics.
     */
    metricsJson() {
        return {
            metrics: this.collector.getMetrics()
        };
    }
};
exports.MetricsController = MetricsController;
tslib_1.__decorate([
    (0, endpoints_1.Get)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", String)
], MetricsController.prototype, "metrics", null);
tslib_1.__decorate([
    (0, endpoints_1.Get)('/json'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Object)
], MetricsController.prototype, "metricsJson", null);
exports.MetricsController = MetricsController = tslib_1.__decorate([
    (0, endpoints_1.Controller)('/metrics'),
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [collector_1.MetricsCollector])
], MetricsController);
//# sourceMappingURL=metrics.controller.js.map