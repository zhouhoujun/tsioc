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
        // if (!ctx.reflects) {
        //     ctx.reflects = this.container.getTypeReflects();
        // }
        if (!ctx.targetReflect && ctx.targetType) {
            ctx.targetReflect = ctx.reflects.create(ctx.targetType);
        }
        if (next) {
            return next();
        }
    }
}
