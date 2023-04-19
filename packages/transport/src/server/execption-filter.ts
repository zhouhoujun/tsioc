import { AssetContext, ExecptionFilter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ErrorRespondAdapter } from './error.respond';


@Injectable({ static: true })
export class ExecptionFinalizeFilter<TCtx extends AssetContext> extends ExecptionFilter<TCtx> {

    constructor(private respondAdatper: ErrorRespondAdapter<TCtx>) {
        super()
    }

    catchError(context: TCtx, err: any, caught: Observable<any>): any {
        return this.respondAdatper.respond(context, err);
    }

}
