import { Injectable } from '@tsdi/ioc';
import { ExecptionFilter } from '@tsdi/core';
import { Logger } from '@tsdi/logger';
import { Observable } from 'rxjs';
import { Responder } from './Responder';
import { TransportContext } from './TransportContext';


@Injectable({ static: true })
export class ExecptionFinalizeFilter<TCtx extends TransportContext> extends ExecptionFilter<TCtx> {

    catchError(context: TCtx, err: any, caught: Observable<any>): any {
        context.get(Logger)?.error(err);
        return context.get(Responder).sendExecption(context, err);
    }

}
