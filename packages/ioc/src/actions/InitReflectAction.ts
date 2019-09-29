import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { ITypeReflect, TargetDecoractors } from '../services';
import { isClass } from '../utils';
import { Singleton } from '../decorators';
import { DesignDecoratorRegisterer, RuntimeDecoratorRegisterer } from './DecoratorRegisterer';
import { RuntimeDecorators } from './RuntimeDecorators';
import { DesignDecorators } from './DesignDecorators';

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
        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }
        if (!ctx.targetReflect && ctx.targetType) {
            let typeRefs = ctx.reflects;
            if (!typeRefs.has(ctx.targetType)) {
                let designReger = this.container.get(DesignDecoratorRegisterer);
                let runtimeReger = this.container.get(RuntimeDecoratorRegisterer);
                let decs = new TargetDecoractors(
                    new DesignDecorators(ctx.targetType, ctx.reflects, designReger),
                    new RuntimeDecorators(ctx.targetType, ctx.reflects, runtimeReger));
                let targetReflect: ITypeReflect = {
                    type: ctx.targetType,
                    decorators: decs,
                    propProviders: new Map(),
                    methodParams: new Map(),
                    methodParamProviders: new Map(),
                    provides: []
                };
                targetReflect.singleton = ctx.reflects.hasMetadata(Singleton, ctx.targetType);
                typeRefs.set(ctx.targetType, targetReflect);
                ctx.targetReflect = targetReflect;
            } else {
                ctx.targetReflect = typeRefs.get(ctx.targetType);
            }
        }
        if (next) {
            return next();
        }
    }
}
