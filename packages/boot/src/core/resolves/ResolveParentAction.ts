import { IocResolveAction, ResolveActionContext, Type, IocCompositeAction, lang } from '@tsdi/ioc';
import { ParentContainerToken } from '../ContainerPoolToken';


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
                if (parent.has(ctx.token)) {
                    ctx.instance = parent.get(ctx.token, ...ctx.providers);
                }
                if (!ctx.instance) {
                    parent.getActionRegisterer().get(scopeType).execute(ctx);
                }
            }
        }
        if (!ctx.instance) {
            next();
        }
    }
}
