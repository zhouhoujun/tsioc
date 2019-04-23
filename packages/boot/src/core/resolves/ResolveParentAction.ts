import { IocResolveAction, ResolveActionContext, Type, IocCompositeAction, lang } from '@tsdi/ioc';
import { ParentContainerToken } from '../ContainerPool';


/**
 * resolve parent action.
 *
 * @export
 * @class ResolveParentAction
 * @extends {IocResolveAction}
 */
export class ResolveParentAction extends IocResolveAction {
    execute(ctx: ResolveActionContext<any>, next: () => void): void {
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
