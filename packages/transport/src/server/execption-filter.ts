import { ExecptionFilter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ErrorRespondAdapter } from './error.respond';
import { AssetContext } from '../context';


@Injectable({ static: true })
export class ExecptionFinalizeFilter<TCtx extends AssetContext> extends ExecptionFilter<TCtx> {

    catchError(context: TCtx, err: any, caught: Observable<any>): any {
        return context.get(ErrorRespondAdapter).respond(context, err);
    }

}
