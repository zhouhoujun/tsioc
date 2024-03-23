import { Injectable } from '@tsdi/ioc';
import { ExecptionFilter } from '@tsdi/core';
import { Logger } from '@tsdi/logger';
import { Observable } from 'rxjs';
import { RequestContext } from './RequestContext';


@Injectable({ static: true })
export class ExecptionFinalizeFilter<TInput extends RequestContext, TContext = any> extends ExecptionFilter<TInput, any, TContext> {

    catchError(reqCtx: TInput, err: any, caught: Observable<any>, context?: TContext) {
        const logger = reqCtx.get(Logger)?? console;
        logger.error(err);
        return reqCtx.throwExecption(err);
    }

}
