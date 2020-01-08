import { RuntimeActionContext } from './RuntimeActionContext';
import { CTX_ARGS } from '../../context-tokens';


/**
 * create instance action.
 *
 * @export
 * @class CreateInstanceAction
 * @extends {IocRuntimeAction}
 */
export const CreateInstanceAction = function (ctx: RuntimeActionContext, next: () => void): void {
    if (!ctx.target) {
        ctx.target = new ctx.type(...ctx.get(CTX_ARGS));
    }
    next();
};

