import { Type } from '@tsdi/ioc';
import { InjectActionContext } from '@tsdi/core';
import { DIModuleInjectScope } from '@tsdi/boot';


/**
 * task injector register action.
 *
 * @export
 * @class TaskInjectorRegisterAction
 * @extends {DIModuleInjectScope}
 */
export class TaskInjectorRegisterAction extends DIModuleInjectScope {

    protected setNextRegTypes(ctx: InjectActionContext, registered: Type[]) {
        ctx.types = ctx.types.filter(ty => registered.indexOf(ty) < 0);
    }

}
