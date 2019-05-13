import { IContainer, ContainerToken, IocExt, ServiceDecoratorRegisterer } from '@tsdi/core';
import { Suite } from './decorators/Suite';
import {
    Inject, DecoratorScopes, RegisterSingletionAction, RuntimeDecoratorRegisterer
} from '@tsdi/ioc';
import { SuiteDecoratorRegisterer } from './registers';


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
        this.container.get(RuntimeDecoratorRegisterer)
            .register(Suite, DecoratorScopes.Class, RegisterSingletionAction);

        this.container.getActionRegisterer()
            .register(this.container, SuiteDecoratorRegisterer);

        this.container.get(ServiceDecoratorRegisterer).register(Suite, SuiteDecoratorRegisterer);
    }
}
