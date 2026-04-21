"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsInterceptor = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const operators_1 = require("rxjs/operators");
const request_counter_1 = require("../counters/request.counter");
const error_counter_1 = require("../counters/error.counter");
const latency_histogram_1 = require("../histograms/latency.histogram");
/**
 * Metrics interceptor.
 * 自动收集 HTTP 请求指标。
 */
let MetricsInterceptor = class MetricsInterceptor {
    constructor(requestCounter, errorCounter, latencyHistogram) {
        this.requestCounter = requestCounter;
        this.errorCounter = errorCounter;
        this.latencyHistogram = latencyHistogram;
    }
    intercept(input, next, context) {
        const start = Date.now();
        const request = context.getRequest();
        const method = request.method || 'UNKNOWN';
        const path = request.pattern || request.url || '/';
        // Record request
        this.requestCounter.recordRequest(method, path);
        return next.handle(input, context).pipe((0, operators_1.tap)((response) => {
            const duration = Date.now() - start;
            const status = response.statusCode || 200;
            // Record response
            this.requestCounter.recordResponse(method, path, status);
            // Record latency
            this.latencyHistogram.recordLatency(method, path, status, duration);
        }), (0, operators_1.catchError)((err) => {
            const duration = Date.now() - start;
            const status = 500;
            // Record error
            this.errorCounter.recordException(method, path, err.name || 'Error');
            // Record latency even for errors
            this.latencyHistogram.recordLatency(method, path, status, duration);
            throw err;
        }), (0, operators_1.finalize)(() => {
            // Additional cleanup if needed
        }));
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [request_counter_1.RequestCounter,
        error_counter_1.ErrorCounter,
        latency_histogram_1.LatencyHistogram])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptor.js.map