import { Injectable } from '@tsdi/ioc';
import { MetricsCollector } from '../collector';

/**
 * Error counter.
 * 统计 HTTP 错误计数。
 */
@Injectable()
export class ErrorCounter {
    constructor(private collector: MetricsCollector) {
        this.collector.register({
            name: 'http_errors_total',
            description: 'Total number of HTTP errors'
        });
    }

    recordError(method: string, path: string, status: number): void {
        this.collector.increment('http_errors_total', 1, { method, path, status: String(status) });
    }

    recordException(method: string, path: string, exception: string): void {
        this.collector.increment('http_errors_total', 1, { method, path, exception });
    }
}