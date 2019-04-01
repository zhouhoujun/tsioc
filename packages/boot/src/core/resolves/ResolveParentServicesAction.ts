import { IocResolveServicesAction, ResolveServicesContext, ResolveServicesScopeAction } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class ResolveParentServicesAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext<any>, next: () => void): void {
        let parent = this.container.get(ParentContainerToken);

        while (parent) {
            parent.get(ResolveServicesScopeAction).execute(ctx);
            parent = parent.get(ParentContainerToken);
        }
        next();

    }
}
