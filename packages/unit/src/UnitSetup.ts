import { IContainer, ContainerToken, IocExt } from '@ts-ioc/core';
import { Suite } from './decorators/Suite';
import {
    Inject, DecoratorType, ComponentInitAction, RegisterSingletionAction,
    ComponentBeforeInitAction, ComponentAfterInitAction, RuntimeDecoratorRegisterer,
    DesignDecoratorRegisterer, BindProviderAction
} from '@ts-ioc/ioc';


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
        // let designReg = this.container.get(DesignDecoratorRegisterer);
        // designReg.register(Suite, DecoratorType.Class, BindProviderAction);

        let runtimeReg = this.container.get(RuntimeDecoratorRegisterer);
        runtimeReg.register(Suite, DecoratorType.Class,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction,
            RegisterSingletionAction);
    }
}
