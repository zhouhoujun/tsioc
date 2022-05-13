import { ExecptionChain, ExecptionContext, ExecptionFilter } from '@tsdi/core';
import { Injectable, Injector, tokenId } from '@tsdi/ioc';


export const HTTP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');

/**
 * http execption filter.
 */
@Injectable()
export class HttpExecptionFilter implements ExecptionFilter {

    private _chain?: ExecptionFilter;
    constructor(private injector: Injector) {
        
    }

    handle(ctx: ExecptionContext<Error>, next: () => Promise<void>): Promise<any> {
        if (!this._chain) {
            this._chain = new ExecptionChain(this.injector.get(HTTP_EXECPTION_FILTERS))
        }
        return this._chain.handle(ctx, next)
    }
}
