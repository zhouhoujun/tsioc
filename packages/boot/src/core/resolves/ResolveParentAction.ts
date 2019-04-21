import { Singleton, IocResolveAction, ResolveActionContext, IocResolveScope, Type, IocCompositeAction, lang } from '@tsdi/ioc';
import { ParentContainerToken } from '../ContainerPool';


/**
 * resolve parent action.
 *
 * @export
 * @class ResolveParentAction
 * @extends {IocResolveAction}
 */
@Singleton
export class ResolveParentAction extends IocResolveAction {
    execute(ctx: ResolveActionContext<any>, next: () => void): void {
        // let parent = this.container.get(ParentContainerToken);
        // while (parent && !ctx.instance) {
        //     parent.resolve(IocResolveScope).execute(ctx);
        //     parent = parent.resolve(ParentContainerToken);
        // }
        // if (!ctx.instance) {
        //     next();
        // }
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
