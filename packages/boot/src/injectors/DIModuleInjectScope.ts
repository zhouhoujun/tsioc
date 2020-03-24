import { Type, CTX_CURR_DECOR, IActionSetup } from '@tsdi/ioc';
import { InjectorContext, InjectorRegScope } from '@tsdi/core';





/**
 * di module injector scope.
 *
 * @export
 * @class DIModuleInjectorScope
 * @extends {InjectorRegScope}
 */
export class DIModuleInjectScope extends InjectorRegScope implements IActionSetup {

    execute(ctx: InjectorContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected getTypes(ctx: InjectorContext): Type[] {
        return ctx.types.filter(ty => ctx.reflects.hasMetadata(ctx.getValue(CTX_CURR_DECOR), ty));
    }

    protected setNextRegTypes(ctx: InjectorContext, registered: Type[]) {
        ctx.types = [];
    }
}

