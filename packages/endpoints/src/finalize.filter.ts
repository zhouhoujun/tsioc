import { Injectable } from '@tsdi/ioc';
import { Handler, Filter } from '@tsdi/core';
import { lastValueFrom, mergeMap, Observable } from 'rxjs';
import { RequestContext } from './RequestContext';
import { RestfulRequestContext } from './RestfulRequestContext';



@Injectable({ static: true })
export class FinalizeFilter extends Filter {

    doFilter(request: RequestContext, next: Handler, context?: any): Observable<any> {
        return next.handle(request, context)
            .pipe(
                mergeMap(async res => {
                    if (request.destroyed || (request as RestfulRequestContext).writable === false) return;
                    return await lastValueFrom(request.transport.send(request))
                })
            )
    }
}
