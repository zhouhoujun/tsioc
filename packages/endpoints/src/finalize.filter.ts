import { Injectable } from '@tsdi/ioc';
import { Handler, Filter } from '@tsdi/core';
import { mergeMap, Observable } from 'rxjs';
import { Responder } from './Responder';
import { TransportContext } from './TransportContext';



@Injectable({ static: true })
export class FinalizeFilter extends Filter {

    intercept(context: TransportContext, next: Handler): Observable<any> {
        return next.handle(context)
            .pipe(
                mergeMap(res => {
                    return context.get(Responder).send(context, res)
                })
            )
    }
}
