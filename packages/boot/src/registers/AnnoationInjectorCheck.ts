import { DesignActionContext, CTX_TYPE_REGIN, INJECTOR } from '@tsdi/ioc';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ParentInjectorToken } from '../modules/IModuleReflect';

export const AnnoationInjectorCheck = function (ctx: DesignActionContext, next: () => void): void {
    if (!ctx.has(CTX_TYPE_REGIN)) {
        let injector = ctx.injector.get(ModuleInjector);
        injector.registerValue(ParentInjectorToken, ctx.injector);
        ctx.set(INJECTOR, injector);
    }
    next();
};
