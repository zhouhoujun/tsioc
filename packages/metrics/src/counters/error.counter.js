"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCounter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("../collector");
/**
 * Error counter.
 * 统计 HTTP 错误计数。
 */
let ErrorCounter = class ErrorCounter {
    constructor(collector) {
        this.collector = collector;
        this.collector.register({
            name: 'http_errors_total',
            description: 'Total number of HTTP errors'
        });
    }
    recordError(method, path, status) {
        this.collector.increment('http_errors_total', 1, { method, path, status: String(status) });
    }
    recordException(method, path, exception) {
        this.collector.increment('http_errors_total', 1, { method, path, exception });
    }
};
exports.ErrorCounter = ErrorCounter;
exports.ErrorCounter = ErrorCounter = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [collector_1.MetricsCollector])
], ErrorCounter);
//# sourceMappingURL=error.counter.js.map