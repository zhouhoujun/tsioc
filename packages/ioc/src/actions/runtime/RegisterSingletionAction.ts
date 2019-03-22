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
export class RegisterSingletionAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.targetType && ctx.target && (ctx.singleton || ctx.targetReflect.singleton)) {
            let mgr = ctx.resolve(IocSingletonManager);
            if (!mgr.has(ctx.targetType)) {
                mgr.set(ctx.targetType, ctx.target);
            }
        }
        next();
    }
}

