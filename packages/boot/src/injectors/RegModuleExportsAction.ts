import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../context-tokens';
import { ParentInjectorToken } from '../modules/IModuleReflect';

export class RegModuleExportsAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (ctx.has(CTX_MODULE_EXPORTS) && !ctx.regFor) {
            let parent = ctx.injector.get(ParentInjectorToken);
            if (parent) {
                parent.copy(ctx.get(CTX_MODULE_EXPORTS));
            }
        }
        next();
    }
}
