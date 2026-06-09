import { Injectable } from '@tsdi/ioc';
import { RequestContext, RestfulRequestAdapter, StatusMessageAdapter } from '@tsdi/common';
import { SenderFilter } from '@tsdi/service';
import { Observable, tap, EMPTY, catchError, throwError } from 'rxjs';
import { HTTP_RESPONSE } from '../http-context';

/**
 * HTTP transport sender filter.
 *
 * Wraps the handler chain and writes *every* result (success or error)
 * into the raw HTTP response via the MessageAdapter.  Errors are
 * re-thrown so upstream filters (e.g. Logger) can observe and log them.
 */
@Injectable()
export class HttpTransportSenderFilter extends SenderFilter<any, Observable<any>, RequestContext> {
    doFilter(input: any, next: any, context: RequestContext): Observable<any> {
        return next.handle(input, context).pipe(
            tap((response) => {
                const adapter = context.get(RestfulRequestAdapter);
                if (adapter) {
                    const res = adapter.response;
                    if (res) {
                        adapter.sendResponse(res, response);
                    }
                }
            }),
            catchError((err) => {
                const adapter = context.get(RestfulRequestAdapter);
                if (adapter) {
                    const res = adapter.response;
                    if (res) {
                        adapter.sendError(res, err);
                    }
                }

                // Error has been written to the HTTP response; swallow it so
                // upstream subscribers (which are empty) don't see it.
                return EMPTY;
            })
        );
    }
}
