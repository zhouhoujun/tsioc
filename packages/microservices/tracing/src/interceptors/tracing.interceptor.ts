import { Injectable } from '@tsdi/ioc';
import { MessageAdapter, RequestInterceptor, RequestContext, RequestHandler, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { Observable } from 'rxjs';
import { finalize, tap, catchError } from 'rxjs/operators';
import { brokerDestination, extractBrokerCarrier, normalizeCarrierHeaders } from '../carrier';
import { Tracer } from '../tracer';
import { Span } from '../tracing';

/**
 * Tracing interceptor.
 * 自动收集 HTTP / 消息请求追踪信息。
 */
@Injectable()
export class TracingInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {
    constructor(private tracer: Tracer) {}

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
        const adapter = context.get(MessageAdapter);
        const request = input as any;
        const destination = brokerDestination(request);
        // Broker deliveries carry the trace carrier in protocol headers instead
        // of HTTP headers, so both sources are merged (http wins on collision).
        const headers: Record<string, string> = {
            ...extractBrokerCarrier(request),
            ...normalizeCarrierHeaders(adapter?.getHeaders() ?? {})
        };
        const method = request?.method || (destination ? 'CONSUME' : 'UNKNOWN');
        const path = request?.pattern || request?.url || destination || '/';

        const extractedContext = this.tracer.extractContext(headers);

        // Start span
        const span = this.tracer.startSpan(`${method} ${path}`, {
            kind: 'SERVER',
            parent: extractedContext ?? undefined,
            attributes: {
                ...(destination ? { 'messaging.destination': destination } : {}),
                'http.method': method,
                'http.url': path,
                'http.scheme': 'http',
                'service.name': this.tracer.serviceName
            }
        });

        // Inject trace context into response headers
        if (typeof adapter?.setHeader === 'function') {
            const responseHeaders: Record<string, string> = {};
            this.tracer.injectContext(span.context(), responseHeaders);
            for (const [key, value] of Object.entries(responseHeaders)) {
                adapter.setHeader(key, value);
            }
        }

        return new Observable<WritableLike<Outgoing>>(subscriber =>
            this.tracer.runWithSpan(span, () =>
                next.handle(input, context).pipe(
                    tap((response: WritableLike<Outgoing>) => {
                        const status = response.statusCode || 200;
                        span.setAttribute('http.status_code', status);
                        if (status >= 400) {
                            span.setStatus('ERROR');
                        } else {
                            span.setStatus('OK');
                        }
                    }),
                    catchError((err: Error) => {
                        span.recordError(err);
                        throw err;
                    }),
                    finalize(() => {
                        span.finish();
                    })
                ).subscribe(subscriber)
            )
        );
    }
}