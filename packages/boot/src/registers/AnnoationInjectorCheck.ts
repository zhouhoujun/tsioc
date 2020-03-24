import { DesignContext, CTX_TYPE_REGIN, INJECTOR } from '@tsdi/ioc';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ParentInjectorToken } from '../modules/IModuleReflect';

export const AnnoationInjectorCheck = function (ctx: DesignContext, next: () => void): void {
    if (!ctx.hasValue(CTX_TYPE_REGIN)) {
        let injector = ctx.injector.getInstance(ModuleInjector);
        injector.setValue(ParentInjectorToken, ctx.injector);
        ctx.setValue(INJECTOR, injector);
    }
    next();
};
