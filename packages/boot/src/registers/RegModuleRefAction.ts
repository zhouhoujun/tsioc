import { DesignActionContext } from '@tsdi/ioc';
import { CTX_MODULE_EXPORTS } from '../context-tokens';
import { ModuleRef } from '../modules/ModuleRef';
import { IModuleReflect } from '../modules/IModuleReflect';

export const RegModuleRefAction = function (ctx: DesignActionContext, next: () => void): void {
    let reflect = ctx.targetReflect as IModuleReflect;
    if (reflect) {
        let mdRef = new ModuleRef(ctx.type, reflect, ctx.getValue(CTX_MODULE_EXPORTS));
        ctx.injector.registerValue(ModuleRef, mdRef);
        ctx.set(ModuleRef, mdRef);
        reflect.getModuleRef = () => mdRef;
    }
    next();
};
