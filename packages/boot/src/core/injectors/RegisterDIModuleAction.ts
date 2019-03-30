import { InjectorAction, InjectorActionContext } from '@tsdi/core';
import { isClass } from '@tsdi/ioc';
import { ModuleInjectLifeScope } from '../services';

export class RegisterDIModuleAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        if (isClass(ctx.currType) && ctx.currDecoractor) {
            this.container.get(ModuleInjectLifeScope).register(ctx.currType, ctx.currDecoractor);
            ctx.registered.push(ctx.currType);
        }
        next();
    }
}
