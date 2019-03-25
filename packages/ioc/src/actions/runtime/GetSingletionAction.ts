import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IocSingletonManager } from '../../services';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRuntimeAction}
 */
export class GetSingletionAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.targetType && ctx.targetReflect.singleton) {
            let mgr = this.container.resolve(IocSingletonManager);
            if (mgr.has(ctx.targetType)) {
                ctx.target = mgr.get(ctx.targetType);
                return;
            }
        }
        next();
    }
}

