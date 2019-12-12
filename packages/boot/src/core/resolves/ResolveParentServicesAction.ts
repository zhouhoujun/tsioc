import { Type, IocCompositeAction, lang, ActionInjector, CTX_CURR_SCOPE } from '@tsdi/ioc';
import { IocResolveServicesAction, ResolveServicesContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPoolToken';


export class ResolveParentServicesAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx.has(CTX_CURR_SCOPE)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_CURR_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionInjector).get(scopeType).execute(ctx, next);
            }
        }
    }
}
