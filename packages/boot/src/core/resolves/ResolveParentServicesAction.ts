import { IocResolveServicesAction, ResolveServicesContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPoolToken';
import { Type, IocCompositeAction, lang } from '@tsdi/ioc';


export class ResolveParentServicesAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx.scope) {
            let scopeType: Type<IocCompositeAction> = lang.getClass(ctx.scope);
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.getActionRegisterer().get(scopeType).execute(ctx, next);
            }
        }
    }
}
