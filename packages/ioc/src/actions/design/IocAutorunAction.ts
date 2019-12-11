import { AutorunMetadata } from '../../metadatas/AutorunMetadata';
import { isFunction } from '../../utils/lang';
import { IocDesignAction } from './IocDesignAction';
import { DesignActionContext } from './DesignActionContext';
import { CTX_CURR_DECOR } from '../../context-tokens';

/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export class IocAutorunAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void) {
        this.runAuto(ctx);
        next();
    }

    protected runAuto(ctx: DesignActionContext) {
        let refs = ctx.reflects;
        let currDec = ctx.get(CTX_CURR_DECOR);
        if (!refs.hasMetadata(currDec, ctx.targetType)) {
            return;
        }
        let injector = ctx.injector;
        let metadatas = refs.getMetadata<AutorunMetadata>(currDec, ctx.targetType);
        metadatas.forEach(meta => {
            if (meta && meta.autorun) {
                let instance = injector.get(ctx.tokenKey || ctx.targetType);
                if (instance && isFunction(instance[meta.autorun])) {
                    injector.invoke(instance, meta.autorun);
                }
            }
        });
    }
}
