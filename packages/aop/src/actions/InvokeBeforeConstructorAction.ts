import { RuntimeActionContext, CTX_ARGS, CTX_PARAMS, ActionInjectorToken } from '@tsdi/ioc';
import { isValideAspectTarget } from './isValideAspectTarget';
import { ProceedingScope } from '../proceeding/ProceedingScope';

/**
 * actions invoke before constructor.
 *
 * @export
 */
export const InvokeBeforeConstructorAction = function (ctx: RuntimeActionContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!isValideAspectTarget(ctx.type, reflects)) {
        return next();
    }

    reflects.getActionInjector().getInstance(ActionInjectorToken)
        .getInstance(ProceedingScope)
        .beforeConstr(ctx.type, ctx.getValue(CTX_PARAMS), ctx.getValue(CTX_ARGS), ctx.providers);

    next();

};
