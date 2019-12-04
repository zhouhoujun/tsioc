import { IocCompositeAction } from '@tsdi/ioc';
import { ResolveServiceContext, CTX_CURR_TOKEN } from '@tsdi/core';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentServiceAction } from './ResolveParentServiceAction';
import { ContainerPoolToken } from '../ContainerPoolToken';



export class ResolveRouteServiceAction extends IocCompositeAction<ResolveServiceContext>  {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (this.container.has(ContainerPoolToken)) {
            let token = ctx.token;
            let options = ctx.getOptions();
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

    setup() {
        this.use(ResolveModuleExportAction)
            .use(ResolveParentServiceAction);
    }
}
