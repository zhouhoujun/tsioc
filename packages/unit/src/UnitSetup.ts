import { IContainer, Inject, ContainerToken, LifeScopeToken, IocExt, CoreActions } from '@ts-ioc/core';
import { Suite } from './core';


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
        let lifeScope = this.container.get(LifeScopeToken);
        lifeScope.registerDecorator(Suite, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
    }
}
