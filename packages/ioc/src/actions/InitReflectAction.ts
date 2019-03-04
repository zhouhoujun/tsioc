import { IocAction, IocActionContext } from './Action';
import { lang, isUndefined } from '../utils';
import { TypeReflects, DecoratorRegisterer } from '../services';
import { hasOwnClassMetadata } from '../factories';
import { Singleton } from '../decorators';


export class InitReflectAction extends IocAction {

    execute(ctx: IocActionContext, next: () => void): void {
        if (!ctx.targetType && ctx.target) {
            ctx.targetType = lang.getClass(ctx.target);
        }
        if (!ctx.targetType) {
            return;
        }
        if (!ctx.targetReflect && ctx.targetType) {
            ctx.targetReflect = this.container.resolve(TypeReflects).get(ctx.targetType, true);
            ctx.targetReflect.type =  ctx.targetReflect.type || ctx.targetType;
            ctx.targetReflect.decors = ctx.targetReflect.decors || [];
            ctx.targetReflect.provides = ctx.targetReflect.provides || [];
            if (isUndefined(ctx.targetReflect.singleton)) {
                let singleton = hasOwnClassMetadata(Singleton, ctx.targetType);
                let metadata = this.container.get(DecoratorRegisterer).findClassMetadata(ctx.targetType, m => m.singleton === true);
                singleton = !!metadata;
                ctx.targetReflect.singleton = singleton;
            }
        }
        next();
    }
}
