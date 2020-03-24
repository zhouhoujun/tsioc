
import { DesignContext } from '@tsdi/ioc';
import { CTX_MODULE_EXPORTS } from '../context-tokens';
import { ParentInjectorToken } from '../modules/IModuleReflect';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ModuleRef } from '../modules/ModuleRef';

export const RegModuleExportsAction = function (ctx: DesignContext, next: () => void): void {
    if (ctx.hasValue(CTX_MODULE_EXPORTS) && ctx.targetReflect.regIn !== 'root') {
        let parent = ctx.injector.getInstance(ParentInjectorToken);
        if (parent) {
            if (parent instanceof ModuleInjector) {
                parent.export(ctx.getValue(ModuleRef));
            } else {
                parent.copy(ctx.getValue(CTX_MODULE_EXPORTS));
            }
        }
    }
    next();
};
