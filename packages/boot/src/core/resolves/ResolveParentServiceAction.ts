import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton, Type, IocCompositeAction, lang } from '@tsdi/ioc';

@Singleton
export class ResolveParentServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        if (ctx.currScope instanceof IocCompositeAction && this.container.has(ParentContainerToken)) {
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currScope);
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.get(scopeType).execute(ctx, next);
            }
        } else {
            next();
        }
    }
}
