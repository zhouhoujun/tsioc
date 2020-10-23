import { Type, IActionSetup, refl } from '@tsdi/ioc';
import { InjContext, InjRegScope } from '@tsdi/core';
import { ModuleReflect } from '../modules/reflect';



/**
 * di module inject scope.
 *
 * @export
 * @class DIModuleInjectorScope
 * @extends {InjRegScope}
 */
export class InjDIModuleScope extends InjRegScope implements IActionSetup {

    execute(ctx: InjContext, next?: () => void): void {
        let types = this.getTypes(ctx);
        this.registerTypes(ctx, types);
        next && next();
    }

    protected getTypes(ctx: InjContext): Type[] {
        return ctx.types.filter(ty => refl.get<ModuleReflect>(ty)?.annoType === 'module');
    }

    protected setNextRegTypes(ctx: InjContext, registered: Type[]) {
        ctx.types = [];
    }
}

