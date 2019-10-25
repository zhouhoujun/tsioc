import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';


export class ResolveServiceTokenAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        this.resolve(ctx, ctx.currToken || ctx.token)
        if (!ctx.instance) {
            next();
        }
    }
}
