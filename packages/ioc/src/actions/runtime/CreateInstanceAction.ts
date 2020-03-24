import { RuntimeContext } from './RuntimeActionContext';
import { CTX_ARGS } from '../../context-tokens';


/**
 * create instance action.
 *
 * @export
 * @class CreateInstanceAction
 * @extends {IocRuntimeAction}
 */
export const CreateInstanceAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.target) {
        ctx.target = new ctx.type(...ctx.getValue(CTX_ARGS));
    }
    next();
};

