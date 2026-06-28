import expect = require('expect');
import { MetricsRegistry } from '../src/registry';
import { MemoryGauge } from '../src/gauges/memory.gauge';

describe('MemoryGauge', () => {
    it('registers memory metric names on construction', () => {
        const reg = new MetricsRegistry();
        const gauge = new MemoryGauge(reg);
        const metrics = reg.getMetrics();
        const names = metrics.map(m => m.name);
        expect(names).toContain('memory_heap_used_bytes');
        expect(names).toContain('memory_heap_total_bytes');
        expect(names).toContain('memory_rss_bytes');
        expect(names).toContain('memory_external_bytes');
        gauge.onDestroy();
    });

    it('updates metrics with current memory usage', () => {
        const reg = new MetricsRegistry();
        const gauge = new MemoryGauge(reg);
        const metrics = reg.getMetrics();
        const heapUsed = metrics.find(m => m.name === 'memory_heap_used_bytes');
        expect(heapUsed!.value).toBeGreaterThan(0);
        gauge.onDestroy();
    });

    it('onDestroy clears interval', () => {
        const reg = new MetricsRegistry();
        const gauge = new MemoryGauge(reg);
        gauge.onDestroy();
        // Should not throw
    });
});
