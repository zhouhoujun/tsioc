import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPoolToken';
import { Type, IocCompositeAction, lang } from '@tsdi/ioc';

export class ResolveParentServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.scope) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.scope);
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getActionRegisterer().get(scopeType).execute(ctx, next);
            }
        }
    }
}
