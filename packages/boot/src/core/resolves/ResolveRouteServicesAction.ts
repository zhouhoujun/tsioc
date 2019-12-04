import { IocCompositeAction } from '@tsdi/ioc';
import { ResolveServicesContext, CTX_CURR_TOKEN } from '@tsdi/core';
import { ResolveSerivesInExportAction } from './ResolveSerivesInExportAction';
import { ResolveParentServicesAction } from './ResolveParentServicesAction';
import { ContainerPoolToken } from '../ContainerPoolToken';


export class ResolveRouteServicesAction extends IocCompositeAction<ResolveServicesContext>  {
    execute(ctx: ResolveServicesContext, next?: () => void): void {
        if (this.container.has(ContainerPoolToken)) {
            let token = ctx.token;
            let options = ctx.getOptions()
            options.token = ctx.get(CTX_CURR_TOKEN) || ctx.token;
            super.execute(ctx);
            if (!ctx.instance) {
                options.token = token;
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
