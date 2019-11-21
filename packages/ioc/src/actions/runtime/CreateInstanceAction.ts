import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext, CTX_ARGS } from './RuntimeActionContext';


/**
 * create instance action.
 *
 * @export
 * @class CreateInstanceAction
 * @extends {IocRuntimeAction}
 */
export class CreateInstanceAction extends IocRuntimeAction {
    execute(ctx: RuntimeActionContext, next: () => void): void {
        if (!ctx.target) {
            ctx.target = new ctx.targetType(...ctx.get(CTX_ARGS));
        }
        next();
    }
}
