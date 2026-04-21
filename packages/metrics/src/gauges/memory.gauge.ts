import { Injectable, OnDestroy } from '@tsdi/ioc';
import { MetricsCollector } from '../collector';

/**
 * Memory gauge.
 * 监控内存使用情况。
 */
@Injectable()
export class MemoryGauge implements OnDestroy {
    private intervalId?: ReturnType<typeof setInterval>;

    constructor(private collector: MetricsCollector) {
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

    private startCollection(): void {
        this.updateMetrics();
        this.intervalId = setInterval(() => this.updateMetrics(), 10000); // Every 10 seconds
    }

    private updateMetrics(): void {
        const memoryUsage = process.memoryUsage();
        this.collector.gauge('memory_heap_used_bytes', memoryUsage.heapUsed);
        this.collector.gauge('memory_heap_total_bytes', memoryUsage.heapTotal);
        this.collector.gauge('memory_rss_bytes', memoryUsage.rss);
        this.collector.gauge('memory_external_bytes', memoryUsage.external);
    }

    onDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}