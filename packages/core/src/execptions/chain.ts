import { Handler, chain } from '@tsdi/ioc';
import { NEXT } from '../transport/middleware';
import { ExecptionContext } from './context';
import { ExecptionFilter } from './filter';

/**
 * execption chain.
 */
export class ExecptionChain implements ExecptionFilter {

    private _chain?: Handler<ExecptionContext>;
    constructor(private filters: ExecptionFilter[]) {

    }

    handle(ctx: ExecptionContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.completed) return NEXT();
        if (!this._chain) {
            const fns = this.filters.map(f => (c: ExecptionContext, n: () => Promise<void>) => f.handle(c, n));
            this._chain = chain(fns)
        }
        return this._chain(ctx, next ?? NEXT)
    }
}
