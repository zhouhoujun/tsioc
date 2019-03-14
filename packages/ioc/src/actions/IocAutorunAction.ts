import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { getTypeMetadata, hasClassMetadata } from '../factories';
import { Autorun } from '../decorators';
import { AutorunMetadata } from '../metadatas';
import { isFunction } from '../utils';
/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRegisterAction}
 */
export class IocAutorunAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void) {
        this.runAuto(ctx, Autorun);
        next();
    }

    protected runAuto(ctx: RegisterActionContext, decorator: string | Function) {
        if (hasClassMetadata(decorator, ctx.targetType)) {
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

