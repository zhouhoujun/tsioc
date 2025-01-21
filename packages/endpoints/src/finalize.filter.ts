import { Injectable } from '@tsdi/ioc';
import { Handler, Filter } from '@tsdi/core';
import { mergeMap, Observable } from 'rxjs';
import { RequestContext } from './RequestContext';



@Injectable({ static: true })
export class FinalizeFilter extends Filter {

    doFilter(request: RequestContext, next: Handler, context?: any): Observable<any> {
        return next.handle(request, context)
            .pipe(
                mergeMap(res => {
                    return request.transport.send(request);
                })
            )
    }
}
