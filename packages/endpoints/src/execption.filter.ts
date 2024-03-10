import { Injectable } from '@tsdi/ioc';
import { ExecptionFilter } from '@tsdi/core';
import { Logger } from '@tsdi/logger';
import { Observable } from 'rxjs';
import { RequestContext } from './RequestContext';


@Injectable({ static: true })
export class ExecptionFinalizeFilter<TCtx extends RequestContext> extends ExecptionFilter<TCtx> {

    catchError(context: TCtx, err: any, caught: Observable<any>) {
        const logger = context.get(Logger)?? console;
        logger.error(err);
        return context.throwExecption(err);
    }

}
