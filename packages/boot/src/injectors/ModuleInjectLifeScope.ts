import { isClass, LifeScope, Type, ActionInjector, CTX_CURR_DECOR, IActionSetup, IInjector } from '@tsdi/ioc';
import { InjectAction, InjectActionContext, InjectorRegisterScope, CTX_CURR_TYPE } from '@tsdi/core';
import { AnnoationContext } from '../AnnoationContext';
import { CheckAnnoationAction } from './CheckAnnoationAction';
import { AnnoationRegisterScope } from './AnnoationRegisterScope';
import { RegModuleExportsAction } from './RegModuleExportsAction';
import { ModuleRef } from '../modules/ModuleRef';



/**
 * Module inject life scope.
 *
 * @export
 * @class ModuleInjectLifeScope
 * @extends {LifeScope<AnnoationContext>}
 */
export class ModuleInjectLifeScope extends LifeScope<AnnoationContext> implements IActionSetup {

    setup() {
        this.actInjector
            .regAction(DIModuleInjectScope)
            .regAction(CheckAnnoationAction)
            .regAction(AnnoationRegisterScope)
            .regAction(RegModuleExportsAction);

        this.use(CheckAnnoationAction)
            .use(AnnoationRegisterScope)
            .use(RegModuleExportsAction);
    }

    register<T>(injector: IInjector, type: Type<T>, decorator: string): ModuleRef<T> {
        let ctx = AnnoationContext.parse(injector, {
            module: type,
            decorator: decorator
        });
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
export class DIModuleInjectScope extends InjectorRegisterScope implements IActionSetup {

    execute(ctx: InjectActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected getTypes(ctx: InjectActionContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.get(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectActionContext, registered: Type[]) {
        ctx.types = [];
    }

    setup() {
        this.use(RegisterDIModuleAction);
    }
}

export class RegisterDIModuleAction extends InjectAction {
    execute(ctx: InjectActionContext, next: () => void): void {
        let currType = ctx.get(CTX_CURR_TYPE);
        let currDecor = ctx.get(CTX_CURR_DECOR);
        if (isClass(currType) && currDecor) {
            ctx.get(ActionInjector)
                .get(ModuleInjectLifeScope)
                .register(ctx.injector, currType, currDecor);
            ctx.registered.push(currType);
        }
        next();
    }
}
