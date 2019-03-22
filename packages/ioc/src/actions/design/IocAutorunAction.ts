import { DesignActionContext } from './DesignActionContext';
import { getTypeMetadata, hasClassMetadata } from '../../factories';
import { Autorun } from '../../decorators';
import { AutorunMetadata } from '../../metadatas';
import { isFunction, isClass } from '../../utils';
import { IocDesignAction } from './IocDesignAction';
/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export class IocAutorunAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        this.runAuto(ctx, Autorun);
        next();
    }

    protected runAuto(ctx: DesignActionContext, decorator: string | Function) {
        if (isClass(ctx.targetType) && hasClassMetadata(decorator, ctx.targetType)) {
            let metas = getTypeMetadata<AutorunMetadata>(decorator, ctx.targetType);
            let meta = metas.find(it => !!it.autorun);
            if (!meta && metas.length) {
                meta = metas[0]
            }

            if (meta) {
                let instance = ctx.resolve(ctx.tokenKey || ctx.token);
                if (instance && meta.autorun && isFunction(instance[meta.autorun])) {
                    ctx.getRaiseContainer().syncInvoke(instance, meta.autorun);
                }
            }
        }
    }
}

