import { ResolveServiceContext, CTX_CURR_TOKEN } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';


export class ResolveServiceTokenAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        this.resolve(ctx, ctx.getContext(CTX_CURR_TOKEN) || ctx.token)
        if (!ctx.instance) {
            next();
        }
    }
}
