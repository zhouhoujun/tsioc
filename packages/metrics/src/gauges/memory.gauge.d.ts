import { OnDestroy } from '@tsdi/ioc';
import { MetricsCollector } from '../collector';
/**
 * Memory gauge.
 * 监控内存使用情况。
 */
export declare class MemoryGauge implements OnDestroy {
    private collector;
    private intervalId?;
    constructor(collector: MetricsCollector);
    private startCollection;
    private updateMetrics;
    onDestroy(): void;
}
