import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { isClass } from '../utils/lang';

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

        let targetReflect = ctx.targetReflect;
        if (!targetReflect.getInjector) {
            let injector = ctx.injector;
            targetReflect.getInjector = () => {
                return injector;
            }
        }
        if (ctx.singleton) {
            targetReflect.singleton = ctx.singleton;
        }

        if (next) {
            return next();
        }
    }
}
