import { MetricsCollector } from '../collector';
/**
 * Request counter.
 * 统计 HTTP 请求计数。
 */
export declare class RequestCounter {
    private collector;
    constructor(collector: MetricsCollector);
    recordRequest(method: string, path: string): void;
    recordResponse(method: string, path: string, status: number): void;
}
