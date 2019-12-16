import { isClass, LifeScope, Type, ActionInjector, CTX_CURR_DECOR, IInjector } from '@tsdi/ioc';
import { InjectorAction, InjectorActionContext, InjectorRegisterScope, CTX_CURR_TYPE } from '@tsdi/core';
import { AnnoationContext } from '../AnnoationContext';
import { CheckAnnoationAction } from './CheckAnnoationAction';
import { AnnoationRegisterScope } from './AnnoationRegisterScope';
import { RegModuleRefAction } from './RegModuleRefAction';
import { ModuleRef } from '../modules/ModuleRef';



/**
 * Module inject life scope.
 *
 * @export
 * @class ModuleInjectLifeScope
 * @extends {LifeScope<AnnoationContext>}
 */
export class ModuleInjectLifeScope extends LifeScope<AnnoationContext> {

    setup() {
        this.actInjector
            .regAction(DIModuleInjectorScope)
            .regAction(CheckAnnoationAction)
            .regAction(AnnoationRegisterScope)
            .regAction(RegModuleRefAction);

        this.use(CheckAnnoationAction)
            .use(AnnoationRegisterScope)
            .use(RegModuleRefAction);
    }

    register<T>(type: Type<T>, decorator: string): ModuleRef<T> {
        let ctx = AnnoationContext.parse({
            module: type,
            decorator: decorator
        }, this.actInjector.getFactory());
        this.execute(ctx);
        return ctx.has(ModuleRef) ? ctx.get(ModuleRef) as ModuleRef<T> : null;
    }
}


/**
 * di module injector scope.
 *
 * @export
 * @class DIModuleInjectorScope
 * @extends {InjectorRegisterScope}
 */
export class DIModuleInjectorScope extends InjectorRegisterScope {

    execute(ctx: InjectorActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected getTypes(ctx: InjectorActionContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.get(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type[]) {
        ctx.types = [];
    }

    setup() {
        this.use(RegisterDIModuleAction);
    }
}

export class RegisterDIModuleAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        let currType = ctx.get(CTX_CURR_TYPE);
        let currDecor = ctx.get(CTX_CURR_DECOR);
        if (isClass(currType) && currDecor) {
            ctx.get(ActionInjector)
                .get(ModuleInjectLifeScope)
                .register(currType, currDecor);
            ctx.registered.push(currType);
        }
        next();
    }
}
