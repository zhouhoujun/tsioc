import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { isClass } from '../utils';

/**
 * init class reflect action.
 *
 * @export
 * @class InitReflectAction
 * @extends {IocRegisterAction}
 */
export class InitReflectAction extends IocRegisterAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!isClass(ctx.targetType)) {
            return;
        }
        ctx.reflects.create(ctx.targetType);
        if (ctx.singleton) {
            ctx.targetReflect.singleton = ctx.singleton;
        }

        if (next) {
            return next();
        }
    }
}
