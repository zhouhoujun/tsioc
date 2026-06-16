import { Injectable } from '@tsdi/ioc';
import { RequestContext, RequestFilter, RestfulRequestAdapter } from '@tsdi/common';
import { Observable, of, mergeMap, catchError, throwError } from 'rxjs';

@Injectable()
export class McpTransportSenderFilter extends RequestFilter<any, Observable<any>, RequestContext> {
    doFilter(input: any, next: any, context: RequestContext): Observable<any> {
        return next.handle(input, context).pipe(
            mergeMap((response) => {
                const adapter = context.get(RestfulRequestAdapter);
                if (adapter) {
                    const err = adapter.error;
                    if (err) {
                        adapter.sendError(err);
                    } else {
                        adapter.sendResponse(response);
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
