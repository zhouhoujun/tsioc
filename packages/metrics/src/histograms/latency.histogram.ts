import { Injectable } from '@tsdi/ioc';
import { MetricsCollector } from '../collector';

/**
 * Latency histogram.
 * 统计 HTTP 请求响应延迟。
 */
@Injectable()
export class LatencyHistogram {
    constructor(private collector: MetricsCollector) {
        this.collector.register({
            name: 'http_request_duration_ms',
            description: 'HTTP request duration in milliseconds'
        });
    }

    recordLatency(method: string, path: string, status: number, duration: number): void {
        this.collector.timing('http_request_duration_ms', duration, {
            method,
            path,
            status: String(status)
        });
    }
}