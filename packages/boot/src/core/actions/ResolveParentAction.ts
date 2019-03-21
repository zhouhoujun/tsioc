import { IocResolveAction, ResovleActionContext, Singleton, ResolveScopeAction } from '@ts-ioc/ioc';
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

    execute(ctx: ResovleActionContext, next: () => void): void {
        let curr = ctx.getRaiseContainer();
        let parent = ctx.resolve(ParentContainerToken);

        while (parent && !ctx.instance) {
            parent.bindActionContext(ctx);
            parent.get(ResolveScopeAction).execute(ctx);
            parent = ctx.resolve(ParentContainerToken);
        }

        if (!ctx.instance) {
            curr.bindActionContext(ctx);
            next();
        }
    }
}
