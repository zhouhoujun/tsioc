import { IocResolveServicesAction, ResolveServicesContext, ResolveServicesScope } from '@tsdi/core';
import { ParentContainerToken } from '../ContainerPool';
import { Singleton, Type, IocCompositeAction, lang } from '@tsdi/ioc';

@Singleton
export class ResolveParentServicesAction extends IocResolveServicesAction {

    execute(ctx: ResolveServicesContext<any>, next: () => void): void {
        // let parent = this.container.get(ParentContainerToken);
        // while (parent) {
        //     parent.get(ResolveServicesScope).execute(ctx);
        //     parent = parent.get(ParentContainerToken);
        // }
        // next();
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
