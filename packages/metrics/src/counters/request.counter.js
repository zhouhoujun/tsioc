"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestCounter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("../collector");
/**
 * Request counter.
 * 统计 HTTP 请求计数。
 */
let RequestCounter = class RequestCounter {
    constructor(collector) {
        this.collector = collector;
        this.collector.register({
            name: 'http_requests_total',
            description: 'Total number of HTTP requests'
        });
        this.collector.register({
            name: 'http_responses_total',
            description: 'Total number of HTTP responses'
        });
    }
    recordRequest(method, path) {
        this.collector.increment('http_requests_total', 1, { method, path });
    }
    recordResponse(method, path, status) {
        this.collector.increment('http_responses_total', 1, { method, path, status: String(status) });
    }
};
exports.RequestCounter = RequestCounter;
exports.RequestCounter = RequestCounter = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [collector_1.MetricsCollector])
], RequestCounter);
//# sourceMappingURL=request.counter.js.map