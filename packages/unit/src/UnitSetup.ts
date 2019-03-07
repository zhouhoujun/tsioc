import { IContainer, ContainerToken, IocExt } from '@ts-ioc/core';
import { Suite } from './decorators/Suite';
import { Inject, DecoratorRegisterer, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentAfterInitAction, ComponentInitAction } from '@ts-ioc/ioc';


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
        let decReg = this.container.get(DecoratorRegisterer);
        decReg.register(Suite, BindProviderAction, IocGetCacheAction, IocSetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
    }
}
