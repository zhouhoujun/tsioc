import { RequestInterceptor, RequestContext, RequestHandler, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { Observable } from 'rxjs';
import { RequestCounter } from '../counters/request.counter';
import { ErrorCounter } from '../counters/error.counter';
import { LatencyHistogram } from '../histograms/latency.histogram';
/**
 * Metrics interceptor.
 * 自动收集 HTTP 请求指标。
 */
export declare class MetricsInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {
    private requestCounter;
    private errorCounter;
    private latencyHistogram;
    constructor(requestCounter: RequestCounter, errorCounter: ErrorCounter, latencyHistogram: LatencyHistogram);
    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>>;
}
