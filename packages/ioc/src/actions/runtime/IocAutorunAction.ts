import { AutorunMetadata } from '../../metadatas';
import { isFunction } from '../../utils';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IocRuntimeAction } from './IocRuntimeAction';
import { getOwnTypeMetadata } from '../../factories';
/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export class IocAutorunAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        this.runAuto(ctx);
        next();
    }

    protected runAuto(ctx: RuntimeActionContext, ) {
        let metadatas = getOwnTypeMetadata<AutorunMetadata>(ctx.currDecoractor, ctx.targetType);
        metadatas.forEach(meta => {
            if (meta && meta.autorun) {
                let instance = this.container.resolve(ctx.tokenKey || ctx.token);
                if (instance && isFunction(instance[meta.autorun])) {
                    this.container.syncInvoke(instance, meta.autorun);
                }
            }
        });
    }
}
