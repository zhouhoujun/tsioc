import { RuntimeContext } from './RuntimeActionContext';
import { RuntimeParamScope } from './RuntimeParamScope';
import { CTX_ARGS, CTX_PARAMS } from '../../context-tokens';

/**
 * resolve constructor args action.
 *
 */
export const CtorArgsAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.hasValue(CTX_ARGS)) {
        let targetReflect = ctx.targetReflect;
        let injector = ctx.injector;
        if (targetReflect.methodParams.has('constructor')) {
            ctx.setValue(CTX_PARAMS, targetReflect.methodParams.get('constructor'));
        } else {
            ctx.reflects.getActionInjector().getInstance(RuntimeParamScope).execute(ctx);
            ctx.setValue(CTX_PARAMS, targetReflect.methodParams.get('constructor'));
        }
        ctx.setValue(CTX_ARGS, injector.createParams(ctx.get(CTX_PARAMS), ctx.providers));
    }
    next();
};

