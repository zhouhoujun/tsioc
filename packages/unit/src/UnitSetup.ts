import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Suite } from './decorators/Suite';
import {
    Inject, DecoratorScopes, ComponentInitAction, RegisterSingletionAction,
    ComponentBeforeInitAction, ComponentAfterInitAction, RuntimeDecoratorRegisterer
} from '@tsdi/ioc';


/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt('setup')
export class UnitSetup {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let runtimeReg = this.container.get(RuntimeDecoratorRegisterer);
        runtimeReg.register(Suite, DecoratorScopes.Class,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction,
            RegisterSingletionAction);
    }
}
