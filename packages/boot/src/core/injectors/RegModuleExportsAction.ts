import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../../context-tokens';

export class RegModuleExportsAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let reflect = ctx.targetReflect;
        if (reflect && ctx.has(CTX_MODULE_EXPORTS)) {
            let exportInj = ctx.get(CTX_MODULE_EXPORTS);
            reflect.getModuleExports = () => {
                return exportInj;
            }
        }
        next();
    }
}
