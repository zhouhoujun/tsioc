import { ExecptionFilter } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ExecptionRespondAdapter } from './execption.respond';
import { TransportContext } from './TransportContext';


@Injectable({ static: true })
export class ExecptionFinalizeFilter<TCtx extends TransportContext> extends ExecptionFilter<TCtx> {

    catchError(context: TCtx, err: any, caught: Observable<any>): any {
        return context.get(ExecptionRespondAdapter).respond(context, err);
    }

}
