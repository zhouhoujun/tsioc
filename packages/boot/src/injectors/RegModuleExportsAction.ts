import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../context-tokens';
import { ParentInjectorToken } from '../modules/IModuleReflect';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ModuleRef } from '../modules/ModuleRef';

export class RegModuleExportsAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (ctx.has(CTX_MODULE_EXPORTS) && ctx.regFor !== 'root') {
            let parent = ctx.injector.get(ParentInjectorToken);
            if (parent) {
                if (parent instanceof ModuleInjector) {
                    parent.export(ctx.get(ModuleRef));
                } else {
                    parent.copy(ctx.get(CTX_MODULE_EXPORTS));
                }
            }
        }
        next();
    }
}
