import { RuntimeActionContext, CTX_ARGS, CTX_PARAMS } from './RuntimeActionContext';
import { RuntimeParamScope } from './RuntimeParamScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { ActionRegisterer } from '../ActionRegisterer';

/**
 * resolve constructor args action.
 *
 * @export
 * @class ConstructorArgsAction
 * @extends {IocRuntimeAction}
 */
export class ConstructorArgsAction extends IocRegisterScope<RuntimeActionContext> {

    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (!ctx.has(CTX_ARGS)) {
            if (ctx.targetReflect.methodParams.has('constructor')) {
                ctx.set(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
            } else {
                this.container.getInstance(ActionRegisterer).get(RuntimeParamScope)
                    .execute(ctx);
                ctx.set(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
            }
            ctx.set(CTX_ARGS, this.container.createParams(ctx.get(CTX_PARAMS), ctx.providerMap));
        }
        next();
    }
}
