"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Metrics collector abstract interface.
 *
 * 指标收集器抽象接口，用于收集和存储各种类型的指标。
 */
let MetricsCollector = class MetricsCollector {
};
exports.MetricsCollector = MetricsCollector;
exports.MetricsCollector = MetricsCollector = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], MetricsCollector);
//# sourceMappingURL=collector.js.map