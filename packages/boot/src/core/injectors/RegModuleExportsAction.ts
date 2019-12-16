import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../../context-tokens';
import { ModuleRef } from '../modules/ModuleRef';

export class RegModuleExportsAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let reflect = ctx.targetReflect;
        if (reflect) {
            let mdRef = new ModuleRef(ctx.module, reflect, ctx.get(CTX_MODULE_EXPORTS));
            ctx.set(ModuleRef, mdRef);
            reflect.getModuleRef = () => {
                return mdRef;
            }

        }
        next();
    }
}
