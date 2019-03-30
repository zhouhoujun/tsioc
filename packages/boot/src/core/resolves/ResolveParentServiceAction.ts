import { IocResolveServiceAction, ResolveServiceContext, ResolveServiceScopeAction } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class ResolveParentServiceAction extends IocResolveServiceAction {

    execute(ctx: ResolveServiceContext, next: () => void): void {
        let parent = this.container.resolve(ParentContainerToken);

        while (parent && !ctx.instance) {
            parent.resolve(ResolveServiceScopeAction).execute(ctx);
            parent = parent.resolve(ParentContainerToken);
        }

        if (!ctx.instance) {
            next();
        }
    }
}
