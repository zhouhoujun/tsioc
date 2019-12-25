import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IocSingletonManager } from '../IocSingletonManager';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRuntimeAction}
 */
export class RegisterSingletionAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.type && ctx.target && ctx.targetReflect.singleton) {
            let mgr = ctx.injector.getInstance(IocSingletonManager);
            if (!mgr.has(ctx.type)) {
                mgr.set(ctx.type, ctx.target);
            }
        }
        next();
    }
}

