import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeParamScope } from './RuntimeParamScope';
import { CTX_ARGS, CTX_PARAMS } from '../../context-tokens';

/**
 * resolve constructor args action.
 *
 * @export
 * @class ConstructorArgsAction
 * @extends {IocRuntimeAction}
 */
export const ConstructorArgsAction = function (ctx: RuntimeActionContext, next: () => void): void {
    if (!ctx.hasValue(CTX_ARGS)) {
        let injector = ctx.injector;
        if (ctx.targetReflect.methodParams.has('constructor')) {
            ctx.set(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
        } else {
            ctx.reflects.getActionInjector().getInstance(RuntimeParamScope).execute(ctx);
            ctx.set(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
        }
        ctx.set(CTX_ARGS, injector.createParams(ctx.get(CTX_PARAMS), ctx.providers));
    }
    next();
};

