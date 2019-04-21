import { ResolveServicesContext } from '@tsdi/core';
import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ResolveSerivesInExportAction } from './ResolveSerivesInExportAction';
import { ResolveParentServicesAction } from './ResolveParentServicesAction';


@Singleton
@Autorun('setup')
export class ResolveRouteServicesAction extends IocCompositeAction<ResolveServicesContext<any>>  {
    execute(ctx: ResolveServicesContext<any>, next?: () => void): void {
        let token = ctx.token;
        ctx.token = ctx.currToken || ctx.token;
        let donext = () => {
            ctx.token = token;
            next && next();
        }
        super.execute(ctx, donext);
    }

    protected setScope(ctx: ResolveServicesContext<any>, parentScope?: any) {

    }

    setup() {
        this.use(ResolveSerivesInExportAction)
            .use(ResolveParentServicesAction);
    }
}
