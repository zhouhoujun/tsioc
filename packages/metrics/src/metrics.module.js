"use strict";
var MetricsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsModule = exports.METRICS_PROVIDERS = exports.METRICS_OPTIONS = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("./collector");
const registry_1 = require("./registry");
const metrics_controller_1 = require("./metrics.controller");
const metrics_interceptor_1 = require("./interceptors/metrics.interceptor");
const counters_1 = require("./counters");
const gauges_1 = require("./gauges");
const histograms_1 = require("./histograms");
/**
 * Metrics module options token.
 */
exports.METRICS_OPTIONS = (0, ioc_1.token)('METRICS_OPTIONS');
/**
 * Metrics module providers.
 */
exports.METRICS_PROVIDERS = [
    registry_1.MetricsRegistry,
    { provide: collector_1.MetricsCollector, useClass: registry_1.MetricsRegistry },
    counters_1.RequestCounter,
    counters_1.ErrorCounter,
    gauges_1.MemoryGauge,
    histograms_1.LatencyHistogram,
    metrics_interceptor_1.MetricsInterceptor,
    metrics_controller_1.MetricsController
];
/**
 * Metrics module.
 *
 * 指标监控模块，提供指标收集和 Prometheus 格式导出。
 */
let MetricsModule = MetricsModule_1 = class MetricsModule {
    /**
     * create metrics module with options.
     * @param options metrics module options.
     * @returns module with providers.
     */
    static withOptions(options) {
        const providers = [
            { provide: exports.METRICS_OPTIONS, useValue: options }
        ];
        return {
            module: MetricsModule_1,
            providers
        };
    }
};
exports.MetricsModule = MetricsModule;
exports.MetricsModule = MetricsModule = MetricsModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: exports.METRICS_PROVIDERS,
        exports: [metrics_controller_1.MetricsController, registry_1.MetricsRegistry]
    })
], MetricsModule);
//# sourceMappingURL=metrics.module.js.map