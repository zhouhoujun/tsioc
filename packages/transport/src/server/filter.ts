import { Handler, Filter, AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { mergeMap, Observable } from 'rxjs';
import { RespondAdapter } from './respond';



@Injectable({ static: true })
export class ServerFinalizeFilter extends Filter {

    constructor(private respondAdapter: RespondAdapter) {
        super()
    }

    intercept(context: AssetContext, next: Handler): Observable<any> {
        return next.handle(context)
            .pipe(
                mergeMap(res => {
                    return this.respondAdapter.respond(context)
                })
            )
    }
}
