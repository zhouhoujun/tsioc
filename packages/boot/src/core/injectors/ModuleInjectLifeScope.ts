import { isClass, LifeScope, Type, Inject, ActionRegisterer, CTX_CURR_DECOR } from '@tsdi/ioc';
import { IContainer, ContainerToken, InjectorAction, InjectorActionContext, InjectorRegisterScope, CTX_CURR_TYPE } from '@tsdi/core';
import { AnnoationContext, CTX_MODULE_RESOLVER } from '../AnnoationContext';
import { CheckAnnoationAction } from './CheckAnnoationAction';
import { AnnoationRegisterScope } from './AnnoationRegisterScope';
import { RegModuleExportsAction } from './RegModuleExportsAction';
import { ModuleResovler } from './ModuleResovler';



/**
 * Module inject life scope.
 *
 * @export
 * @class ModuleInjectLifeScope
 * @extends {LifeScope<AnnoationContext>}
 */
export class ModuleInjectLifeScope extends LifeScope<AnnoationContext> {

    @Inject(ContainerToken)
    container: IContainer;

    setup() {
        this.registerAction(DIModuleInjectorScope, true)
            .registerAction(CheckAnnoationAction)
            .registerAction(AnnoationRegisterScope, true)
            .registerAction(RegModuleExportsAction);

        this.use(CheckAnnoationAction)
            .use(AnnoationRegisterScope)
            .use(RegModuleExportsAction);
    }

    register<T>(type: Type<T>, decorator: string): ModuleResovler<T> {
        let ctx = AnnoationContext.parse({
            module: type,
            decorator: decorator
        }, this.container.getFactory());
        this.execute(ctx);
        return ctx.getContext(CTX_MODULE_RESOLVER) as ModuleResovler<T>;
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
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.getContext(CTX_CURR_DECOR), ty));
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
        let currType = ctx.getContext(CTX_CURR_TYPE);
        let currDecor = ctx.getContext(CTX_CURR_DECOR);
        if (isClass(currType) && currDecor) {
            this.container.getInstance(ActionRegisterer)
                .get(ModuleInjectLifeScope)
                .register(currType, currDecor);
            ctx.registered.push(currType);
        }
        next();
    }
}
