import { ResolveServiceContext } from '@tsdi/core';
import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentServiceAction } from './ResolveParentServiceAction';


@Singleton
@Autorun('setup')
export class ResolveRouteServiceAction extends IocCompositeAction<ResolveServiceContext<any>>  {
    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        let token = ctx.token;
        ctx.token = ctx.currToken || ctx.token;
        super.execute(ctx);
        if (!ctx.instance) {
            ctx.token = token;
            next && next();
        }
    }

    protected setScope(ctx: ResolveServiceContext<any>, parentScope?: any) {

    }

    setup() {
        this.use(ResolveModuleExportAction)
            .use(ResolveParentServiceAction);
    }
}
