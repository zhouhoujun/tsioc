import {
    Inject, BindProviderAction, DesignDecoratorRegisterer,
    IocSetCacheAction, ComponentBeforeInitAction, RuntimeDecoratorRegisterer,
    ComponentInitAction, ComponentAfterInitAction, DesignLifeScope,
    IocBeforeConstructorScope, IocAfterConstructorScope, DecoratorScopes, RuntimeMethodScope,
    RuntimePropertyScope, RuntimeAnnoationScope, IocAutorunAction, RegisterSingletionAction
} from '@tsdi/ioc';
import {
    IContainer, ContainerToken, IocExt,
    ResolveTargetServiceAction, ResolvePrivateServiceAction,
    ResolveServiceInClassChain, ServicesResolveLifeScope,
    ResolveDefaultServiceAction, ServiceResolveLifeScope,
    ResolveLifeScope,
    ModuleDecoratorRegisterer
} from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as resolves from './resolves';
import * as services from './services';

import {
    RouteResolveAction, ResolveRouteServiceAction, ResolveRouteServicesAction,
} from './resolves';
import { RouteDesignRegisterAction, RouteRuntimRegisterAction } from './registers';
import { DIModuleRegisterScope } from './injectors';

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
        designReg.register(Annotation, DecoratorScopes.Class, BindProviderAction, IocAutorunAction);
        designReg.register(DIModule, DecoratorScopes.Class, BindProviderAction, IocAutorunAction);

        let runtimeReg = container.get(RuntimeDecoratorRegisterer);
        runtimeReg.register(Annotation, DecoratorScopes.Class,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction,
            RegisterSingletionAction, IocSetCacheAction);

        runtimeReg.register(DIModule, DecoratorScopes.Class,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction,
            RegisterSingletionAction, IocSetCacheAction);

        container.use(modules, resolves, services);

        container.get(ModuleDecoratorRegisterer)
            .register(DIModule, DIModuleRegisterScope);


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

        // design register route.
        container.registerSingleton(RouteDesignRegisterAction, () => new RouteRuntimRegisterAction(container));
        container.get(DesignLifeScope)
            .use(RouteDesignRegisterAction);

        // runtime register route.
        container.registerSingleton(RouteRuntimRegisterAction, () => new RouteRuntimRegisterAction(container));

        container.get(IocBeforeConstructorScope)
            .use(RouteRuntimRegisterAction);

        container.get(IocAfterConstructorScope)
            .use(RouteRuntimRegisterAction);

        container.get(RuntimePropertyScope)
            .use(RouteRuntimRegisterAction);

        container.get(RuntimeMethodScope)
            .use(RouteRuntimRegisterAction);

        container.get(RuntimeAnnoationScope)
            .use(RouteRuntimRegisterAction);

    }
}
