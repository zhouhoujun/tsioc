import { Injectable } from '@tsdi/ioc';
import { RequestContext, RestfulRequestAdapter } from '@tsdi/common';
import { SenderFilter } from '@tsdi/service';
import { Observable, of, mergeMap, catchError, throwError } from 'rxjs';

@Injectable()
export class McpTransportSenderFilter extends SenderFilter<any, Observable<any>, RequestContext> {
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
