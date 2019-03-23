import { IocResolveServicesAction, ResolveServicesContext, ResolveServicesScopeAction } from '@ts-ioc/core';
import { ParentContainerToken } from '../../ContainerPool';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class ResolveParentServicesAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext, next: () => void): void {
        let parent = this.container.resolve(ParentContainerToken);

        while (parent) {
            parent.resolve(ResolveServicesScopeAction).execute(ctx);
            parent = parent.resolve(ParentContainerToken);
        }
        next();

    }
}
