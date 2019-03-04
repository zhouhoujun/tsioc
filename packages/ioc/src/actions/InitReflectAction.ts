import { IocAction, IocActionContext } from './Action';
import { lang } from '../utils';
import { TypeReflects } from '../services';


export class InitReflectAction extends IocAction {

    execute(ctx: IocActionContext, next: () => void): void {
        if (!ctx.targetType && ctx.targetType) {
            ctx.targetType = lang.getClass(ctx.target);
        }
        if (!ctx.targetType) {
            return;
        }
        if (!ctx.targetReflect && ctx.targetType) {
            ctx.targetReflect = this.container.resolve(TypeReflects).get(ctx.targetType, true);
            ctx.targetReflect.type = ctx.targetType;
            ctx.targetReflect.decors = ctx.targetReflect.decors || [];
            ctx.targetReflect.provides = ctx.targetReflect.provides || [];
        }
        next();
    }
}
