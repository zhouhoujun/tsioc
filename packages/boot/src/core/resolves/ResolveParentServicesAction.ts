import { IocResolveServicesAction, ResolveServicesContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPoolToken';
import { Type, IocCompositeAction, lang, ActionRegisterer, CTX_ACTION_SCOPE } from '@tsdi/ioc';


export class ResolveParentServicesAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx.has(CTX_ACTION_SCOPE)) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.get(CTX_ACTION_SCOPE));
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getInstance(ActionRegisterer).get(scopeType).execute(ctx, next);
            }
        }
    }
}
