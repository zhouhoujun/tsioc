import { ResolveServiceContext } from '@tsdi/core';
import { IocCompositeAction, Singleton, Autorun, lang } from '@tsdi/ioc';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentServiceAction } from './ResolveParentServiceAction';
import { ContainerPool } from '../ContainerPool';


@Singleton
@Autorun('setup')
export class ResolveRouteServiceAction extends IocCompositeAction<ResolveServiceContext<any>>  {
    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (this.container.has(ContainerPool)) {
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
        if (!ctx.currScope) {
            ctx.currScope = this;
        }
    }

    setup() {
        this.use(ResolveModuleExportAction)
            .use(ResolveParentServiceAction);
    }
}
