import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { CTX_CURR_TOKEN } from '../contextTokens';


export class ResolveServiceTokenAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        this.resolve(ctx, ctx.get(CTX_CURR_TOKEN) || ctx.token)
        if (!ctx.instance) {
            next();
        }
    }
}
