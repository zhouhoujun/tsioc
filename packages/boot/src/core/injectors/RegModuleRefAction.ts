import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../../context-tokens';
import { ModuleRef } from '../modules/ModuleRef';

export class RegModuleRefAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let reflect = ctx.targetReflect;
        if (reflect) {
            let mdRef = new ModuleRef(ctx.module, reflect, ctx.get(CTX_MODULE_EXPORTS));
            let fac = () => mdRef;
            ctx.injector.set(ModuleRef, fac);
            reflect.getModuleRef = fac;
        }
        next();
    }
}
