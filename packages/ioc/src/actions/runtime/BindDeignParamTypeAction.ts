import { RuntimeActionContext } from './RuntimeActionContext';
import { createDesignParams } from './createDesignParams';

/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export const BindDeignParamTypeAction = function (ctx: RuntimeActionContext, next: () => void) {
    let propertyKey = ctx.propertyKey;
    if (!ctx.targetReflect.methodParams.has(propertyKey)) {
        ctx.targetReflect.methodParams.set(
            propertyKey,
            createDesignParams(ctx, ctx.type, ctx.target, propertyKey));
    }
    next();
};

