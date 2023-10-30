import { Handler, Filter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { RespondAdapter } from './respond';
import { AssetContext } from '../AssetContext';



@Injectable({ static: true })
export class ServerFinalizeFilter extends Filter {

    intercept(context: AssetContext, next: Handler): Observable<any> {
        return next.handle(context)
            .pipe(
                mergeMap(res => {
                    return context.get(RespondAdapter).respond(context)
                })
            )
    }
}
