import { Injectable, Exception } from '@tsdi/ioc';
import { RequestContext, RequestFilter, RestfulRequestAdapter } from '@tsdi/common';
import { Observable, of, mergeMap, catchError, throwError } from 'rxjs';

/**
 * HTTP transport sender filter.
 *
 * Wraps the handler chain and writes *every* result (success or error)
 * into the raw HTTP response via the MessageAdapter.  Errors and
 * error-like responses are re-thrown so upstream filters (e.g.
 * LoggerInterceptor) can observe them.
 */
@Injectable()
export class HttpTransportSenderFilter extends RequestFilter<any, Observable<any>, RequestContext> {
    doFilter(input: any, next: any, context: RequestContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap((response) => {
                const adapter = context.get(RestfulRequestAdapter);
                if (adapter) {
                    const res = adapter.response;
                    if (res) {
                        const err = adapter.error;
                        if (err) {
                            adapter.sendError(err);
                        } else {
                            adapter.sendResponse(response);
                        }
                    }
                }
                return of(response);
            }),
            catchError((err) => {
                const adapter = context.get(RestfulRequestAdapter);
                if (adapter) {
                    adapter.sendError(err);
                }
                return throwError(() => err);
            })
        );
    }
}
