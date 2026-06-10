import { Injectable } from '@tsdi/ioc';
import { RequestContext, RestfulRequestAdapter } from '@tsdi/common';
import { SenderFilter } from '@tsdi/service';
import { Observable, tap, EMPTY, catchError } from 'rxjs';

/**
 * MCP transport sender filter.
 *
 * Wraps the handler chain and writes every result (success or error) into
 * the raw HTTP response via the MessageAdapter.  Errors are swallowed so
 * upstream subscribers never see them.
 */
@Injectable()
export class McpTransportSenderFilter extends SenderFilter<any, Observable<any>, RequestContext> {
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
                return EMPTY;
            })
        );
    }
}
