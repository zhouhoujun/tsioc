import { IocResolveServiceAction, ResolveServiceContext, ResolveServiceScope } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class ResolveParentServiceAction extends IocResolveServiceAction {

    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        let parent = this.container.get(ParentContainerToken);

        while (parent && !ctx.instance) {
            parent.resolve(ResolveServiceScope).execute(ctx);
            parent = parent.resolve(ParentContainerToken);
        }

        if (!ctx.instance) {
            next();
        }
    }
}
