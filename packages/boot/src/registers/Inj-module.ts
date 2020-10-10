import { Type, IActionSetup, refl } from '@tsdi/ioc';
import { InjContext, InjRegScope } from '@tsdi/core';



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
        return ctx.types.filter(ty => refl.getIfy(ty).hasMetadata(ctx.currDecor));
    }

    protected setNextRegTypes(ctx: InjContext, registered: Type[]) {
        ctx.types = [];
    }
}

