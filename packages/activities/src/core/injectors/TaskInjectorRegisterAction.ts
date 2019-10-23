import { Type } from '@tsdi/ioc';
import { InjectorActionContext } from '@tsdi/core';
import { DIModuleInjectorScope } from '@tsdi/boot';


/**
 * task injector register action.
 *
 * @export
 * @class TaskInjectorRegisterAction
 * @extends {DIModuleInjectorScope}
 */
export class TaskInjectorRegisterAction extends DIModuleInjectorScope {

    protected setNextRegTypes(ctx: InjectorActionContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }

}
