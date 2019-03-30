import { IocResolveServicesAction, ResolveServicesContext, ResolveServicesScopeAction } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton } from '@tsdi/ioc';

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
