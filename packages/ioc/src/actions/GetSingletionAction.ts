import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { IocSingletonManager } from '../services';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRegisterAction}
 */
export class GetSingletionAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void): void {
        if (ctx.targetType && (ctx.singleton || ctx.targetReflect.singleton)) {
            let mgr = ctx.resolve(IocSingletonManager);
            if (mgr.has(ctx.targetType)) {
                ctx.target = mgr.get(ctx.targetType);
                return;
            }
        }
        next();
    }
}

