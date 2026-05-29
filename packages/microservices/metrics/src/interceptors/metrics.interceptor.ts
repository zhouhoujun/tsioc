import { Injectable } from '@tsdi/ioc';
import { isRequestCapableMessageAdapter, RequestInterceptor, RequestContext, RequestHandler, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { Observable } from 'rxjs';
import { finalize, tap, catchError } from 'rxjs/operators';
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
        private latencyHistogram: LatencyHistogram
    ) {}

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
        const start = Date.now();
        const adapter = context.getMessageAdapter();
        const request = isRequestCapableMessageAdapter(adapter) ? adapter.getRequest() as any : undefined;
        const method = request?.method || 'UNKNOWN';
        const path = request?.pattern || request?.url || '/';

        // Record request
        this.requestCounter.recordRequest(method, path);

        return next.handle(input, context).pipe(
            tap((response: WritableLike<Outgoing>) => {
                const duration = Date.now() - start;
                const status = response.statusCode || 200;

                // Record response
                this.requestCounter.recordResponse(method, path, status);

                // Record latency
                this.latencyHistogram.recordLatency(method, path, status, duration);
            }),
            catchError((err: Error) => {
                const duration = Date.now() - start;
                const status = 500;

                // Record error
                this.errorCounter.recordException(method, path, err.name || 'Error');

                // Record latency even for errors
                this.latencyHistogram.recordLatency(method, path, status, duration);

                throw err;
            }),
            finalize(() => {
                // Additional cleanup if needed
            })
        );
    }
}