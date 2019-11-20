import { ResolveServicesContext, CTX_CURR_TOKEN } from '@tsdi/core';
import { IocCompositeAction } from '@tsdi/ioc';
import { ResolveSerivesInExportAction } from './ResolveSerivesInExportAction';
import { ResolveParentServicesAction } from './ResolveParentServicesAction';
import { ContainerPoolToken } from '../ContainerPoolToken';


export class ResolveRouteServicesAction extends IocCompositeAction<ResolveServicesContext>  {
    execute(ctx: ResolveServicesContext, next?: () => void): void {
        if (this.container.has(ContainerPoolToken)) {
            let token = ctx.token;
            ctx.token = ctx.getContext(CTX_CURR_TOKEN) || ctx.token;
            super.execute(ctx);
            if (!ctx.instance) {
                ctx.token = token;
                next && next();
            }
        } else {
            next && next();
        }
    }

    protected setScope(ctx: ResolveServicesContext, parentScope?: any) {

    }

    setup() {
        this.use(ResolveSerivesInExportAction)
            .use(ResolveParentServicesAction);
    }
}
