import { MetricsCollector } from '../collector';
/**
 * Error counter.
 * 统计 HTTP 错误计数。
 */
export declare class ErrorCounter {
    private collector;
    constructor(collector: MetricsCollector);
    recordError(method: string, path: string, status: number): void;
    recordException(method: string, path: string, exception: string): void;
}
