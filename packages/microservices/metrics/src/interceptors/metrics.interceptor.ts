import { Injectable, Optional } from '@tsdi/ioc';
import { RequestInterceptor, RequestContext, RequestHandler, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RequestCounter } from '../counters/request.counter';
import { ErrorCounter } from '../counters/error.counter';
import { LatencyHistogram } from '../histograms/latency.histogram';

/**
 * Metrics interceptor.
 * 自动收集 HTTP 请求指标。
 */
@Injectable()
export class MetricsInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {
    constructor(
        private requestCounter: RequestCounter,
        private errorCounter: ErrorCounter,
        @Optional() private latencyHistogram?: LatencyHistogram
    ) {}

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
        const start = Date.now();
        const request = input as any;
        const method = request?.method || 'UNKNOWN';
        const path = normalizeMetricPath(request);

        // Record request
        this.requestCounter.recordRequest(method, path);

        return next.handle(input, context).pipe(
            tap((response: WritableLike<Outgoing>) => {
                const duration = Date.now() - start;
                const status = response.statusCode || 200;

                // Record response
                this.requestCounter.recordResponse(method, path, status);

                // Record latency
                this.latencyHistogram?.recordLatency(method, path, status, duration);
            }),
            catchError((err: Error) => {
                const duration = Date.now() - start;
                const status = 500;

                // Record error
                this.errorCounter.recordException(method, path, err.name || 'Error');

                // Record latency even for errors
                this.latencyHistogram?.recordLatency(method, path, status, duration);

                throw err;
            })
        );
    }
}

/**
 * Convert a request into a bounded-cardinality metric path:
 * - prefer the matched route pattern (already templated)
 * - strip the query string
 * - replace numeric/UUID path segments with `:id`
 */
export function normalizeMetricPath(request: any): string {
    const pattern = request?.pattern;
    const raw = typeof pattern === 'string'
        ? pattern
        : (pattern && typeof pattern === 'object' && typeof pattern.path === 'string'
            ? pattern.path
            : request?.url);
    let path = String(raw ?? '/').split('?')[0];
    path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id');
    path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
    path = path.replace(/\/{2,}/g, '/');
    if (!path.startsWith('/')) {
        path = `/${path}`;
    }
    return path.length > 200 ? `${path.slice(0, 200)}…` : path;
}
