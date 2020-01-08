
import { DesignActionContext } from '@tsdi/ioc';
import { CTX_MODULE_EXPORTS } from '../context-tokens';
import { ParentInjectorToken } from '../modules/IModuleReflect';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ModuleRef } from '../modules/ModuleRef';

export const RegModuleExportsAction = function (ctx: DesignActionContext, next: () => void): void {
    if (ctx.has(CTX_MODULE_EXPORTS) && ctx.targetReflect.regIn !== 'root') {
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
};
