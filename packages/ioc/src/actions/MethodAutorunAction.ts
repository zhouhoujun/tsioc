import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { hasMethodMetadata, getMethodMetadata } from '../factories';
import { Autorun } from '../decorators';
import { AutorunMetadata } from '../metadatas';
import { lang, isNumber } from '../utils';
/**
 * Inject DrawType action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRegisterAction}
 */
export class MethodAutorunAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void) {
        if (hasMethodMetadata(Autorun, ctx.targetType)) {
            let metas = getMethodMetadata<AutorunMetadata>(Autorun, ctx.targetType);
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
        next();
    }
}

