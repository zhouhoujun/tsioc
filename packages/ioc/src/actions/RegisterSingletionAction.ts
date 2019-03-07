import { IocRegisterAction, IocActionContext } from './Action';
import { IocSingletonManager } from '../services';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRegisterAction}
 */
export class RegisterSingletionAction extends IocRegisterAction {

    execute(ctx: IocActionContext, next: () => void): void {
        if (ctx.targetType && ctx.target && (ctx.singleton || ctx.targetReflect.singleton)) {
            let mgr = this.container.resolve(IocSingletonManager);
            if (!mgr.has(ctx.targetType)) {
                mgr.set(ctx.targetType, ctx.target);
            }
        }
        next();
    }
}

