import { IocRuntimeScopeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeParamScope } from './RuntimeParamScope';
import { BindDeignParamTypeAction } from './BindDeignParamTypeAction';

/**
 * resolve constructor args action.
 *
 * @export
 * @class ConstructorArgsAction
 * @extends {IocRuntimeAction}
 */
export class ConstructorArgsAction extends IocRuntimeScopeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (!ctx.args) {
            if (ctx.targetReflect.methodParams.has('constructor')) {
                ctx.params = ctx.targetReflect.methodParams.get('constructor');
            } else {
                this.execActions(ctx, [RuntimeParamScope, BindDeignParamTypeAction]);
                ctx.params = ctx.targetReflect.methodParams.get('constructor');
            }
            ctx.args = this.container.createParams(ctx.params, ctx.providerMap);
        }
        next();
    }
}
