import { Singleton } from '../decorators';
import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { isUndefined } from '../utils';
import { DecoratorRegisterer } from '../services';
import { hasOwnClassMetadata } from '../factories';

/**
 * init class reflect action.
 *
 * @export
 * @class InitReflectAction
 * @extends {IocRegisterAction}
 */
export class InitReflectAction extends IocRegisterAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next: () => void): void {
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
                let metadata = this.container.resolve(DecoratorRegisterer).findClassMetadata(ctx.targetType, m => m.singleton === true);
                singleton = !!metadata;
                ctx.targetReflect.singleton = singleton;
            }
        }
        next();
    }
}
