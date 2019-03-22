import {
    Inject, DecoratorRegisterer, BindProviderAction,
    IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction,
    ComponentInitAction, ComponentAfterInitAction, ResolveLifeScope, DesignLifeScope, RuntimeLifeScope
} from '@ts-ioc/ioc';
import {
    IContainer, ContainerToken, IocExt, ModuleInjectorManager,
    ResolveTargetServiceAction, ResolvePrivateServiceAction,
    ResolveServiceInClassChain, ServicesResolveLifeScope, ResolveDefaultServiceAction,
    ServiceResolveLifeScope
} from '@ts-ioc/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as actions from './actions';
import * as handles from './handles';
import * as services from './services';

import { RouteResolveAction, ResolveRouteServiceAction, ResolveRouteServicesAction, RouteDesignRegisterAction, RouteRuntimRegisterAction } from './actions';
import { DIModuleInjector, RootModuleInjector } from './modules';

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
        decReg.register(Annotation, BindProviderAction, IocGetCacheAction, IocSetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
        decReg.register(DIModule, BindProviderAction, IocGetCacheAction, IocSetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);

        container.use(modules, handles, actions, services);

        let chain = container.get(ModuleInjectorManager);
        chain
            .use(RootModuleInjector, true)
            .use(DIModuleInjector, true);


        // route service
        container.get(ServiceResolveLifeScope)
            .useBefore(ResolveRouteServiceAction, ResolveDefaultServiceAction);

        container.get(ResolveTargetServiceAction)
            .useAfter(ResolveRouteServiceAction, ResolvePrivateServiceAction);

        container.get(ResolveServiceInClassChain)
            .useAfter(ResolveRouteServiceAction, ResolvePrivateServiceAction);

        // route services
        container.get(ServicesResolveLifeScope)
            .use(ResolveRouteServicesAction);

        container.get(ResolveLifeScope)
            .use(RouteResolveAction);

        container.get(DesignLifeScope)
            .use(RouteDesignRegisterAction);
        container.get(RuntimeLifeScope)
            .use(RouteRuntimRegisterAction);
    }
}
