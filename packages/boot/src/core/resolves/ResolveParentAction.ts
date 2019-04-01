import { Singleton, IocResolveAction, ResolveActionContext, IocResolveScope } from '@tsdi/ioc';
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

        let parent = this.container.get(ParentContainerToken);

        while (parent && !ctx.instance) {
            parent.resolve(IocResolveScope).execute(ctx);
            parent = parent.resolve(ParentContainerToken);
        }

        if (!ctx.instance) {
            next();
        }
    }
}
