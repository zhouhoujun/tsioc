import { RuntimeContext, CTX_ARGS, CTX_PARAMS, ActionInjectorToken } from '@tsdi/ioc';
import { isValideAspectTarget } from './isValideAspectTarget';
import { ProceedingScope } from '../proceeding/ProceedingScope';

/**
 * invoke after constructor action.
 *
 * @export
 */
export const InvokeAfterConstructorAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    let reflects = ctx.reflects;
    if (!ctx.target || !isValideAspectTarget(ctx.type, reflects)) {
        return next();
    }

    reflects.getActionInjector().getInstance(ActionInjectorToken)
        .getInstance(ProceedingScope)
        .afterConstr(ctx.target, ctx.type, ctx.getValue(CTX_PARAMS), ctx.getValue(CTX_ARGS), ctx.providers);

    next();
};
