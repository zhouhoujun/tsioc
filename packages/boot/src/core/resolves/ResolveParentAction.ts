import { Singleton } from '@tsdi/ioc';
import { ParentContainerToken } from '../ContainerPool';
import { IocResolveAction, ResovleActionContext, ResolveScopeAction } from '@tsdi/core'

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

        let parent = this.container.resolve(ParentContainerToken);

        while (parent && !ctx.instance) {
            parent.resolve(ResolveScopeAction).execute(ctx);
            parent = parent.resolve(ParentContainerToken);
        }

        if (!ctx.instance) {
            next();
        }
    }
}
