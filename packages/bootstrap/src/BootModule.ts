import {
    Inject, DecoratorRegisterer, BindProviderAction,
    IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction,
    ComponentInitAction, ComponentAfterInitAction, ResolveLifeScope
} from '@ts-ioc/ioc';
import { IContainer, ContainerToken, IocExt, ModuleInjectorManager } from '@ts-ioc/core';
import { DIModule } from './decorators/DIModule';
import { Bootstrap } from './decorators/Bootstrap';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as annotations from './annotations';
import * as actions from './actions';

import { RouteResolveAction, ResolveModuleExportAction, ResolveParentAction } from './actions';
import * as services from './services';
import { DIModuleInjector } from './modules';
import { BootstrapInjector, RunnableBuilder, ConfigureManager } from './boot';
import { ContainerPoolToken } from './ContainerPool';

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
        let decReg = container.resolveToken(DecoratorRegisterer);
        decReg.register(Annotation, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        decReg.register(DIModule, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        decReg.register(Bootstrap, BindProviderAction, IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);


        container.use(services, actions, annotations, modules);

        let pool = container.resolveToken(ContainerPoolToken);
        if (pool.isRoot(container)) {
            container.register(ConfigureManager);
        } else {
            container.register(ConfigureManager, () => pool.getRoot().resolveToken(ConfigureManager));
        }

        container
            .register(BootstrapInjector)
            .register(RunnableBuilder);

        // console.log('ConfigureManager:', container.has(ConfigureManager), pool.has(container), pool.getContainers().length);

        container.resolveToken(RouteResolveAction)
            .use(ResolveModuleExportAction)
            .use(ResolveParentAction);

        container.resolveToken(ResolveLifeScope)
            .use(RouteResolveAction);


        let chain = container.resolveToken(ModuleInjectorManager);
        chain.use(DIModuleInjector, true)
            .use(BootstrapInjector, true);
    }
}
