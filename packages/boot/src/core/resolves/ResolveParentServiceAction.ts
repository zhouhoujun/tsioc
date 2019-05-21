import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPoolToken';
import { Type, IocCompositeAction, lang } from '@tsdi/ioc';

export class ResolveParentServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        if (ctx.currActionScope) {
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currActionScope);
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getActionRegisterer().get(scopeType).execute(ctx);
            }
        }
        if (!ctx.instance) {
            next();
        }
    }
}
