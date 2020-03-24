import { AutorunMetadata } from '../../metadatas/AutorunMetadata';
import { isFunction } from '../../utils/lang';
import { DesignContext } from './DesignActionContext';
import { CTX_CURR_DECOR } from '../../context-tokens';

/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export const IocAutorunAction = function (ctx: DesignContext, next: () => void) {
    let refs = ctx.reflects;
    let currDec = ctx.getValue(CTX_CURR_DECOR);
    if (!refs.hasMetadata(currDec, ctx.type)) {
        return;
    }
    let injector = ctx.injector;
    let metadatas = refs.getMetadata<AutorunMetadata>(currDec, ctx.type);
    metadatas.forEach(meta => {
        if (meta && meta.autorun) {
            let instance = injector.get(ctx.token || ctx.type);
            if (instance && isFunction(instance[meta.autorun])) {
                injector.invoke(instance, meta.autorun);
            }
        }
    });
    next();
};

