"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryGauge = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const collector_1 = require("../collector");
/**
 * Memory gauge.
 * 监控内存使用情况。
 */
let MemoryGauge = class MemoryGauge {
    constructor(collector) {
        this.collector = collector;
        this.collector.register({
            name: 'memory_heap_used_bytes',
            description: 'Heap memory used in bytes'
        });
        this.collector.register({
            name: 'memory_heap_total_bytes',
            description: 'Heap memory total in bytes'
        });
        this.collector.register({
            name: 'memory_rss_bytes',
            description: 'RSS memory in bytes'
        });
        this.collector.register({
            name: 'memory_external_bytes',
            description: 'External memory in bytes'
        });
        this.startCollection();
    }
    startCollection() {
        this.updateMetrics();
        this.intervalId = setInterval(() => this.updateMetrics(), 10000); // Every 10 seconds
    }
    updateMetrics() {
        const memoryUsage = process.memoryUsage();
        this.collector.gauge('memory_heap_used_bytes', memoryUsage.heapUsed);
        this.collector.gauge('memory_heap_total_bytes', memoryUsage.heapTotal);
        this.collector.gauge('memory_rss_bytes', memoryUsage.rss);
        this.collector.gauge('memory_external_bytes', memoryUsage.external);
    }
    onDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
};
exports.MemoryGauge = MemoryGauge;
exports.MemoryGauge = MemoryGauge = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [collector_1.MetricsCollector])
], MemoryGauge);
//# sourceMappingURL=memory.gauge.js.map