"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatencyHistogram = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("../collector");
/**
 * Latency histogram.
 * 统计 HTTP 请求响应延迟。
 */
let LatencyHistogram = class LatencyHistogram {
    constructor(collector) {
        this.collector = collector;
        this.collector.register({
            name: 'http_request_duration_ms',
            description: 'HTTP request duration in milliseconds'
        });
    }
    recordLatency(method, path, status, duration) {
        this.collector.timing('http_request_duration_ms', duration, {
            method,
            path,
            status: String(status)
        });
    }
};
exports.LatencyHistogram = LatencyHistogram;
exports.LatencyHistogram = LatencyHistogram = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [collector_1.MetricsCollector])
], LatencyHistogram);
//# sourceMappingURL=latency.histogram.js.map