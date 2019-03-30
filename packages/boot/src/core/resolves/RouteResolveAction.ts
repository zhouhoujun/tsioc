import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ContainerPoolToken } from '../ContainerPool';
import { ResolveModuleExportAction } from './ResolveModuleExportAction';
import { ResolveParentAction } from './ResolveParentAction';
import { ResovleActionContext } from '@tsdi/core';

@Singleton
@Autorun('setup')
export class RouteResolveAction extends IocCompositeAction<ResovleActionContext> {

    execute(ctx: ResovleActionContext, next?: () => void): void {
        if (this.container.has(ContainerPoolToken)) {
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
