import { IocDesignAction, DesignActionContext, CTX_TYPE_REGIN, InjectorToken } from '@tsdi/ioc';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ParentInjectorToken } from '../modules/IModuleReflect';

export class AnnoationInjectorCheck extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        if (!ctx.has(CTX_TYPE_REGIN)) {
            let injector = ctx.injector.get(ModuleInjector);
            injector.registerValue(ParentInjectorToken, ctx.injector);
            ctx.set(InjectorToken, injector);
        }
        next();
    }
}
