import { Injectable } from '@tsdi/ioc';
import { RequestContext, StatusMessageAdapter } from '@tsdi/common';
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
                const adapter = context.get(StatusMessageAdapter);
                if (adapter && typeof (adapter as any).sendResponse === 'function') {
                    const res = context.get(HTTP_RESPONSE);
                    if (res) {
                        (adapter as any).sendResponse(res, response);
                    }
                }
            }),
            catchError((err) => {
                const adapter = context.get(StatusMessageAdapter);
                if (adapter && typeof (adapter as any).sendError === 'function') {
                    const res = context.get(HTTP_RESPONSE);
                    if (res) {
                        (adapter as any).sendError(res, err);
                    }
                }
                // Error has been written to the HTTP response; swallow it so
                // upstream subscribers (which are empty) don't see it.
                return EMPTY;
            })
        );
    }
}
