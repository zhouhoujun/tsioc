import { Injectable } from '@tsdi/ioc';
import { HealthIndicator } from '../indicator';
import { HealthResult } from '../health';

/**
 * Memory health indicator options.
 */
export interface MemoryHealthOptions {
    /**
     * heap usage threshold in percent.
     */
    heapThreshold?: number;
    /**
     * rss usage threshold in percent.
     */
    rssThreshold?: number;
}

/**
 * Memory health indicator.
 * 检查内存使用状态。
 */
@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
    name = 'memory';
    private heapThreshold: number;
    private rssThreshold: number;

    constructor(options?: MemoryHealthOptions) {
        super();
        this.heapThreshold = options?.heapThreshold ?? 0.9; // 90% default
        this.rssThreshold = options?.rssThreshold ?? 0.9;
    }

    async check(): Promise<HealthResult> {
        const memoryUsage = process.memoryUsage();
        const heapUsedPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
        const osTotalMem = require('os').totalmem();
        const rssPercent = memoryUsage.rss / osTotalMem;

        const details = {
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsedPercent: `${Math.round(heapUsedPercent * 100)}%`,
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
            arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)}MB`
        };

        if (heapUsedPercent >= this.heapThreshold || rssPercent >= this.rssThreshold) {
            return {
                status: 'DOWN',
                details,
                error: `Memory usage exceeds threshold. Heap: ${Math.round(heapUsedPercent * 100)}%, RSS: ${Math.round(rssPercent * 100)}%`
            };
        }

        return {
            status: 'UP',
            details
        };
    }
}