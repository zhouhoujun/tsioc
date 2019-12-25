import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { AutorunMetadata } from '../../metadatas/AutorunMetadata';
import { lang, isNumber } from '../../utils/lang';
import { CTX_CURR_DECOR } from '../../context-tokens';

/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRuntimeAction}
 */
export class MethodAutorunAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        this.runAuto(ctx);
        next();
    }

    protected runAuto(ctx: RuntimeActionContext) {
        let currDec = ctx.get(CTX_CURR_DECOR);
        let injector = ctx.injector;
        if (ctx.reflects.hasMethodMetadata(currDec, ctx.type)) {
            let metas = ctx.reflects.getMethodMetadata<AutorunMetadata>(currDec, ctx.type);
            let lastmetas: AutorunMetadata[] = [];
            let idx = Object.keys(metas).length;
            lang.forIn(metas, (mm, key) => {
                if (mm && mm.length) {
                    let m = mm[0];
                    m.autorun = key;
                    idx++;
                    if (!isNumber(m.order)) {
                        m.order = idx;
                    }
                    lastmetas.push(m);
                }
            });

            lastmetas.sort((au1, au2) => {
                return au1.order - au2.order;
            }).forEach(aut => {
                injector.invoke(ctx.target || ctx.type, aut.autorun, ctx.target);
            });
        }
    }
}

