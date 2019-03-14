import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { lang, isUndefined } from '../utils';
import { DecoratorRegisterer } from '../services';
import { hasOwnClassMetadata } from '../factories';
import { Singleton } from '../decorators';

/**
 * init class reflect action.
 *
 * @export
 * @class InitReflectAction
 * @extends {IocRegisterAction}
 */
export class InitReflectAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!ctx.targetType && ctx.target) {
            ctx.targetType = lang.getClass(ctx.target);
        }
        if (!ctx.targetType) {
            return;
        }
        if (!ctx.targetReflect && ctx.targetType) {
            ctx.targetReflect = this.container.getTypeReflects().get(ctx.targetType, true);
            ctx.targetReflect.type =  ctx.targetReflect.type || ctx.targetType;
            ctx.targetReflect.decors = ctx.targetReflect.decors || [];
            ctx.targetReflect.provides = ctx.targetReflect.provides || [];
            if (isUndefined(ctx.targetReflect.singleton)) {
                let singleton = hasOwnClassMetadata(Singleton, ctx.targetType);
                let metadata = ctx.resolve(DecoratorRegisterer).findClassMetadata(ctx.targetType, m => m.singleton === true);
                singleton = !!metadata;
                ctx.targetReflect.singleton = singleton;
            }
        }
        next();
    }
}
