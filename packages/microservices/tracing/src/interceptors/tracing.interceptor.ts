import { Injectable } from '@tsdi/ioc';
import { MessageAdapter, RequestInterceptor, RequestContext, RequestHandler, Incoming, Outgoing, ReadableLike, WritableLike } from '@tsdi/common';
import { Observable } from 'rxjs';
import { finalize, tap, catchError } from 'rxjs/operators';
import { Tracer } from '../tracer';
import { Span } from '../tracing';

/**
 * Tracing interceptor.
 * 自动收集 HTTP 请求追踪信息。
 */
@Injectable()
export class TracingInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {
    constructor(private tracer: Tracer) {}

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
        const adapter = context.get(MessageAdapter);
        const request = input as any;
        const method = request?.method || 'UNKNOWN';
        const path = request?.pattern || request?.url || '/';

        // Extract trace context from headers
        const headers: Record<string, string> = {};
        const allHeaders = adapter?.getHeaders() ?? {};
        for (const [key, value] of Object.entries(allHeaders)) {
            if (typeof value === 'string') {
                headers[key.toLowerCase()] = value;
            }
        }

        const extractedContext = this.tracer.extractContext(headers);

        // Start span
        const span = this.tracer.startSpan(`${method} ${path}`, {
            kind: 'SERVER',
            parent: extractedContext ? {
                spanId: extractedContext.spanId,
                traceId: extractedContext.traceId,
                parentSpanId: extractedContext.parentSpanId,
                context: () => extractedContext,
                // Mock span methods for parent context
                setName: () => {},
                setStatus: () => {},
                setAttribute: () => {},
                log: () => {},
                recordError: () => {},
                finish: () => {}
            } as any as Span : undefined,
            attributes: {
                'http.method': method,
                'http.url': path,
                'http.scheme': 'http',
                'service.name': this.tracer.serviceName
            }
        });

        // Inject trace context into response headers
        const responseHeaders: Record<string, string> = {};
        this.tracer.injectContext(span.context(), responseHeaders);
        for (const [key, value] of Object.entries(responseHeaders)) {
            adapter.setHeader(key, value);
        }

        return next.handle(input, context).pipe(
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
        );
    }
}