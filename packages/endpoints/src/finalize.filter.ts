import { Injectable } from '@tsdi/ioc';
import { Handler, Filter } from '@tsdi/core';
import { mergeMap, Observable } from 'rxjs';
import { RequestContext } from './RequestContext';



@Injectable({ static: true })
export class FinalizeFilter extends Filter {

    intercept(context: RequestContext, next: Handler): Observable<any> {
        return next.handle(context)
            .pipe(
                mergeMap(res => {
                    return context.respond()
                })
            )
    }
}
