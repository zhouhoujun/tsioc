import { Injectable } from '@tsdi/ioc';
import { ExecptionChain } from '../execptions/chain';
import { ExecptionContext } from '../execptions/context';
import { ExecptionFilter } from '../execptions/filter';
import { TransportServer } from '../transport/server';

/**
 * response execption filter.
 */
@Injectable()
export class ResponseExecptionFilter extends ExecptionFilter {

    private _chain?: ExecptionFilter;


    handle(ctx: ExecptionContext<Error>, next: () => Promise<void>): Promise<any> {
        if (!this._chain) {
            const server = ctx.get(TransportServer);
            this._chain = new ExecptionChain(server.context.injector.get(server.getExecptionsToken()));
        }
        return this._chain.handle(ctx, next)
    }
}
