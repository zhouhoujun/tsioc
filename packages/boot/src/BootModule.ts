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
import * as boots from './boot';

import { RouteResolveAction, ResolveModuleExportAction, ResolveParentAction } from './actions';
import * as services from './services';
import { DIModuleInjector, RootModuleInjector, BootstrapInjector } from './modules';

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

        container.use(modules);

        let chain = container.get(ModuleInjectorManager);
        chain
            .use(RootModuleInjector, true)
            .use(DIModuleInjector, true)
            .use(BootstrapInjector, true);

        container.use(services, actions, annotations, boots);

        // let pool = container.get(ContainerPoolToken);
        // if (pool.isRoot(container)) {
        //     container.register(ConfigureManager);
        // }

        container.get(RouteResolveAction)
            .use(ResolveModuleExportAction)
            .use(ResolveParentAction);

        container.get(ResolveLifeScope)
            .use(RouteResolveAction);


    }
}
