import { ResolveServiceContext } from '@tsdi/core';
import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentServiceAction } from './ResolveParentServiceAction';


@Singleton
@Autorun('setup')
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

    setup() {
        this.use(ResolveModuleExportAction)
            .use(ResolveParentServiceAction);
    }
}
