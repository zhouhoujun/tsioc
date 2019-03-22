import { IocRuntimeAction } from './IocRuntimeAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { hasMethodMetadata, getMethodMetadata } from '../../factories';
import { Autorun } from '../../decorators';
import { AutorunMetadata } from '../../metadatas';
import { lang, isNumber } from '../../utils';
/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRuntimeAction}
 */
export class MethodAutorunAction extends IocRuntimeAction {

    execute(ctx: RuntimeActionContext, next: () => void) {
        this.runAuto(ctx, Autorun);
        next();
    }

    protected runAuto(ctx: RuntimeActionContext, decor: string | Function) {
        if (hasMethodMetadata(decor, ctx.targetType)) {
            let metas = getMethodMetadata<AutorunMetadata>(decor, ctx.targetType);
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
                return au1.order - au1.order;
            }).forEach(aut => {
                this.container.syncInvoke(ctx.target || ctx.targetType, aut.autorun, ctx.target);
            });
        }
    }
}

