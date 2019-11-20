import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { AutorunMetadata } from '../../metadatas';
import { lang, isNumber } from '../../utils';
import { CTX_CURR_DECOR } from '../RegisterActionContext';
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
        let currDec = ctx.getContext(CTX_CURR_DECOR);
        if (ctx.reflects.hasMethodMetadata(currDec, ctx.targetType)) {
            let metas = ctx.reflects.getMethodMetadata<AutorunMetadata>(currDec, ctx.targetType);
            let lastmetas: AutorunMetadata[] = [];
            let idx = Object.keys(metas).length;
            lang.forIn(metas, (mm, key: string) => {
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
                this.container.invoke(ctx.target || ctx.targetType, aut.autorun, ctx.target);
            });
        }
    }
}

