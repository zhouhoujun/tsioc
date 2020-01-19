import { Type, CTX_CURR_DECOR, IActionSetup } from '@tsdi/ioc';
import { InjectActionContext, InjectRegisterScope } from '@tsdi/core';





/**
 * di module injector scope.
 *
 * @export
 * @class DIModuleInjectorScope
 * @extends {InjectRegisterScope}
 */
export class DIModuleInjectScope extends InjectRegisterScope implements IActionSetup {

    execute(ctx: InjectActionContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected getTypes(ctx: InjectActionContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.getValue(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectActionContext, registered: Type[]) {
        ctx.types = [];
    }
}

