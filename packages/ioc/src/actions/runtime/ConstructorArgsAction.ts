import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeParamScope } from './RuntimeParamScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { CTX_ARGS, CTX_PARAMS } from '../../context-tokens';

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
            let injector = ctx.injector;
            if (ctx.targetReflect.methodParams.has('constructor')) {
                ctx.set(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
            } else {
                this.actInjector.getInstance(RuntimeParamScope).execute(ctx);
                ctx.set(CTX_PARAMS, ctx.targetReflect.methodParams.get('constructor'));
            }
            ctx.set(CTX_ARGS, injector.createParams(ctx.get(CTX_PARAMS), ctx.providers));
        }
        next();
    }
}
