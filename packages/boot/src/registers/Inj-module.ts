import { Type, refl } from '@tsdi/ioc';
import { InjContext, InjAction } from '@tsdi/core';
import { ModuleReflect } from '../modules/reflect';



/**
 * di module inject scope.
 *
 * @export
 * @class DIModuleInjectorScope
 * @extends {InjAction}
 */
export class InjDIModuleScope extends InjAction {

    protected getTypes(ctx: InjContext): Type[] {
        return ctx.types.filter(ty => refl.get<ModuleReflect>(ty)?.annoType === 'module');
    }

    protected setNextRegTypes(ctx: InjContext, registered: Type[]) {
        ctx.types = [];
    }
}

