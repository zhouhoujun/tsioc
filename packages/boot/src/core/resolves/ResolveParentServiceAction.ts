import { Type, IocCompositeAction, lang, ActionInjector, CTX_CURR_SCOPE } from '@tsdi/ioc';
import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPoolToken';

export class ResolveParentServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.has(CTX_CURR_SCOPE)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_CURR_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionInjector).get(scopeType).execute(ctx, next);
            }
        }
    }
}
