import { Injectable } from '@tsdi/ioc';
import { MetricsCollector } from '../collector';

/**
 * Request counter.
 * 统计 HTTP 请求计数。
 */
@Injectable()
export class RequestCounter {
    constructor(private collector: MetricsCollector) {
        this.collector.register({
            name: 'http_requests_total',
            description: 'Total number of HTTP requests'
        });
        this.collector.register({
            name: 'http_responses_total',
            description: 'Total number of HTTP responses'
        });
    }

    recordRequest(method: string, path: string): void {
        this.collector.increment('http_requests_total', 1, { method, path });
    }

    recordResponse(method: string, path: string, status: number): void {
        this.collector.increment('http_responses_total', 1, { method, path, status: String(status) });
    }
}