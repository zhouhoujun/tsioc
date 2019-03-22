import { IocCompositeAction, Singleton, Autorun } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../../ContainerPool';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentAction } from './ResolveParentAction';
import { ResovleActionContext } from '@ts-ioc/core';

@Singleton
@Autorun('setup')
export class RouteResolveAction extends IocCompositeAction<ResovleActionContext> {

    execute(ctx: ResovleActionContext, next?: () => void): void {
        if (ctx.getRaiseContainer().has(ContainerPoolToken)) {
            super.execute(ctx, next);
        } else {
            next();
        }
    }

    setup() {
        this.use(ResolveModuleExportAction)
            .use(ResolveParentAction);
    }
}
