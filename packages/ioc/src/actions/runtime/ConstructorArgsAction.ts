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
        if (!ctx.hasContext(CTX_ARGS)) {
            if (ctx.targetReflect.methodParams.has('constructor')) {
                ctx.setContext(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
            } else {
                this.container.getInstance(ActionRegisterer).get(RuntimeParamScope)
                    .execute(ctx);
                ctx.setContext(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
            }
            ctx.setContext(CTX_ARGS, this.container.createParams(ctx.getContext(CTX_PARAMS), ctx.providerMap));
        }
        next();
    }
}
