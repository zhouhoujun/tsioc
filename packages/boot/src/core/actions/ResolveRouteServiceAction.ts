import { ResolveServiceContext } from '@ts-ioc/core';
import { IocCompositeAction } from '@ts-ioc/ioc';

export class ResolveRouteServiceAction extends IocCompositeAction<ResolveServiceContext>  {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        let token = ctx.token;
        ctx.token = ctx.currToken || ctx.token;
        let donext = () => {
            ctx.token = token;
            next && next();
        }
        super.execute(ctx, donext);
    }
}
