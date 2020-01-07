import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';

/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRuntimeAction}
 */
export class GetSingletionAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (ctx.type && ctx.targetReflect.singleton) {
            if (ctx.injector.hasSingleton(ctx.type)) {
                ctx.target = ctx.injector.getSingleton(ctx.type);
                return;
            }
        }
        next();
    }
}
