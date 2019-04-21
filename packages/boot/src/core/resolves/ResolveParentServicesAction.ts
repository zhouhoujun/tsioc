import { IocResolveServicesAction, ResolveServicesContext } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton, Type, IocCompositeAction, lang } from '@tsdi/ioc';

@Singleton
export class ResolveParentServicesAction extends IocResolveServicesAction {
    execute(ctx: ResolveServicesContext<any>, next: () => void): void {
        if (ctx.currScope) {
            let scopeType: Type<IocCompositeAction<any>> = lang.getClass(ctx.currScope);
            let parent = this.container.get(ParentContainerToken);
            if (parent && parent !== this.container) {
                parent.get(scopeType).execute(ctx);
            }
        }
        if (!ctx.instance) {
            next();
        }
    }
}
