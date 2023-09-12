import { Handler, Filter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { RespondAdapter } from './respond';
import { TransportContext } from './TransportContext';



@Injectable({ static: true })
export class FinalizeFilter extends Filter {

    intercept(context: TransportContext, next: Handler): Observable<any> {
        return next.handle(context)
            .pipe(
                mergeMap(res => {
                    return context.get(RespondAdapter).respond(context, res)
                })
            )
    }
}
