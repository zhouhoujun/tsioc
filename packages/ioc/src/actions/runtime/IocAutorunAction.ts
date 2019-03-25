import { Autorun } from '../../decorators';
import { AutorunMetadata } from '../../metadatas';
import { isFunction } from '../../utils';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IocRuntimeAction } from './IocRuntimeAction';
/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export class IocAutorunAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        this.runAuto(ctx, Autorun);
        next();
    }

    protected runAuto(ctx: RuntimeActionContext, decorator: string | Function) {
        let refl = ctx.targetReflect;
        let meta = refl.annotations.get(isFunction(decorator) ? decorator.toString() : decorator) as AutorunMetadata;
        if (meta && meta.autorun) {
            let instance = this.container.resolve(ctx.tokenKey || ctx.token);
            if (instance && isFunction(instance[meta.autorun])) {
                this.container.syncInvoke(instance, meta.autorun);
            }
        }
    }
}
