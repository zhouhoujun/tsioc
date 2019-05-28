import { IContainer, ContainerToken, IocExt, ServiceDecoratorRegisterer } from '@tsdi/core';
import { Suite } from './decorators/Suite';
import { Inject, DecoratorScopes, RegisterSingletionAction, RuntimeDecoratorRegisterer } from '@tsdi/ioc';
import { SuiteDecoratorRegisterer } from './registers';


/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt('setup')
export class UnitSetup {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {
        container.get(RuntimeDecoratorRegisterer)
            .register(Suite, DecoratorScopes.Class, RegisterSingletionAction);

        container.getActionRegisterer()
            .register(container, SuiteDecoratorRegisterer);

        container.get(ServiceDecoratorRegisterer).register(Suite, SuiteDecoratorRegisterer);
    }
}
