import { MetricsCollector } from '../collector';
/**
 * Latency histogram.
 * 统计 HTTP 请求响应延迟。
 */
export declare class LatencyHistogram {
    private collector;
    constructor(collector: MetricsCollector);
    recordLatency(method: string, path: string, status: number, duration: number): void;
}
