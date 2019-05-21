import { ResolveServiceContext } from '@tsdi/core';
import { IocCompositeAction } from '@tsdi/ioc';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentServiceAction } from './ResolveParentServiceAction';
import { ContainerPoolToken } from '../ContainerPoolToken';



export class ResolveRouteServiceAction extends IocCompositeAction<ResolveServiceContext<any>>  {
    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (this.container.has(ContainerPoolToken)) {
            let token = ctx.token;
            ctx.token = ctx.currToken || ctx.token;
            super.execute(ctx);
            if (!ctx.instance) {
                ctx.token = token;
                next && next();
            }
        } else {
            next && next();
        }
    }

    protected setScope(ctx: ResolveServiceContext<any>, parentScope?: any) {
        if (!ctx.currActionScope) {
            ctx.currActionScope = this;
        }
    }

    setup() {
        this.use(ResolveModuleExportAction)
            .use(ResolveParentServiceAction);
    }
}
