import {
    Inject, BindProviderAction, DesignDecoratorRegisterer, RuntimeDecoratorRegisterer,
    IocGetCacheAction, IocSetCacheAction, ComponentBeforeInitAction,
    ComponentInitAction, ComponentAfterInitAction, DesignLifeScope,
    IocBeforeConstructorScope, IocAfterConstructorScope, DecoratorType, RuntimeMethodScope,
    RuntimePropertyScope, RuntimeAnnoationScope
} from '@ts-ioc/ioc';
import {
    IContainer, ContainerToken, IocExt, ModuleInjectorManager,
    ResolveTargetServiceAction, ResolvePrivateServiceAction,
    ResolveServiceInClassChain, ServicesResolveLifeScope,
    ResolveDefaultServiceAction, ServiceResolveLifeScope,
    ResolveLifeScope
} from '@ts-ioc/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as actions from './actions';
import * as handles from './handles';
import * as services from './services';

import {
    RouteResolveAction, ResolveRouteServiceAction, ResolveRouteServicesAction,
    RouteDesignRegisterAction, RouteRuntimRegisterAction
} from './actions';
import { DIModuleInjector, RootModuleInjector } from './modules';

/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt('setup')
export class BootModule {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {

        let designReg = container.get(DesignDecoratorRegisterer);
        designReg.register(Annotation, DecoratorType.Class, BindProviderAction);
        designReg.register(DIModule, DecoratorType.Class, BindProviderAction);

        let runtimeReg = container.get(RuntimeDecoratorRegisterer);
        runtimeReg.register(Annotation, DecoratorType.Class, IocGetCacheAction, IocSetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);

        runtimeReg.register(DIModule, DecoratorType.Class, IocGetCacheAction, IocSetCacheAction,
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


        // register route.
        container.get(DesignLifeScope)
            .after(RouteDesignRegisterAction);


        container.get(IocBeforeConstructorScope)
            .after(RouteRuntimRegisterAction);

        container.get(IocAfterConstructorScope)
            .after(RouteRuntimRegisterAction);

        container.get(RuntimePropertyScope)
            .after(RouteRuntimRegisterAction);

        container.get(RuntimeMethodScope)
            .after(RouteRuntimRegisterAction);

        container.get(RuntimeAnnoationScope)
            .after(RouteRuntimRegisterAction);

    }
}
