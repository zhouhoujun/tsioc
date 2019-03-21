import { IocResolveServicesAction, ResolveServicesContext, ResolveServicesScopeAction } from '@ts-ioc/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class ResolveParentServicesAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext, next: () => void): void {
        let curr = ctx.getRaiseContainer();
        let parent = ctx.resolve(ParentContainerToken);

        while (parent && !ctx.instance) {
            parent.bindActionContext(ctx);
            parent.get(ResolveServicesScopeAction).execute(ctx);
            parent = ctx.resolve(ParentContainerToken);
        }

        if (!ctx.instance) {
            curr.bindActionContext(ctx);
            next();
        }
    }
}
