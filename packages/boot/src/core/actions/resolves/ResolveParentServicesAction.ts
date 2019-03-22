import { IocResolveServicesAction, ResolveServicesContext, ResolveServicesScopeAction } from '@ts-ioc/core';
import { ParentContainerToken } from '../../ContainerPool';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class ResolveParentServicesAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext, next: () => void): void {
        let curr = ctx.getRaiseContainer();
        let parent = curr.get(ParentContainerToken);

        while (parent) {
            parent.bindActionContext(ctx);
            parent.get(ResolveServicesScopeAction).execute(ctx);
            parent = parent.get(ParentContainerToken);
        }


        curr.bindActionContext(ctx);
        next();

    }
}
