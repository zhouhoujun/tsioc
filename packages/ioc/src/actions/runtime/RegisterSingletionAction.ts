import { RuntimeContext } from './RuntimeActionContext';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRuntimeAction}
 */
export const RegSingletionAction = function (ctx: RuntimeContext, next: () => void): void {
    if (ctx.type && ctx.target && ctx.targetReflect.singleton) {
        if (!ctx.injector.hasSingleton(ctx.type)) {
            ctx.injector.setValue(ctx.type, ctx.target);
        }
    }
    next();
}

