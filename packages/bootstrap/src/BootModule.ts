import {
    Inject, DecoratorRegisterer, BindProviderAction,
    IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction,
    ComponentInitAction, ComponentAfterInitAction
} from '@ts-ioc/ioc';
import { IContainer, ContainerToken, IocExt } from '@ts-ioc/core';
import { DIModule } from './decorators/DIModule';
import { Bootstrap } from './decorators/Bootstrap';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as boot from './boot';
import * as annotations from './annotations';

/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt('setup')
export class BootModule {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;

        let decReg = container.get(DecoratorRegisterer);
        decReg.register(Annotation, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        decReg.register(DIModule, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        decReg.register(Bootstrap, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        container.use(annotations, modules, boot);
    }
}
