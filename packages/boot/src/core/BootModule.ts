import {
    Inject, BindProviderAction, DesignDecoratorRegisterer,
    IocSetCacheAction, ComponentBeforeInitAction, RuntimeDecoratorRegisterer,
    ComponentInitAction, ComponentAfterInitAction, DesignLifeScope,
    IocBeforeConstructorScope, IocAfterConstructorScope, DecoratorScopes, RuntimeMethodScope,
    RuntimePropertyScope, RuntimeAnnoationScope, IocAutorunAction,
    RegisterSingletionAction, IocResolveScope, RuntimeLifeScope, Component, ActionRegisterer
} from '@tsdi/ioc';
import {
    IContainer, ContainerToken, IocExt,
    ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ModuleDecoratorRegisterer, ServicesResolveLifeScope
} from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as services from './services';

import {
    RouteResolveAction, ResolveRouteServiceAction, ResolveRouteServicesAction,
} from './resolves';
import { RouteDesignRegisterAction, RouteRuntimRegisterAction, RegSelectorAction, BindInputPropertyTypeAction, BindInputParamTypeAction } from './registers';
import { DIModuleRegisterScope } from './injectors';
import { SelectorManager } from './SelectorManager';
import { Input } from '../decorators';
import { HandleRegisterer } from './handles';


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

        container.register(HandleRegisterer);
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

        container.use(modules, services);

        container.get(ActionRegisterer)
            .register(container, DIModuleRegisterScope, true);

        container.get(ModuleDecoratorRegisterer)
            .register(DIModule, DIModuleRegisterScope);


        // route service
        container.get(ResolveServiceInClassChain)
            .useAfter(ResolveRouteServiceAction, ResolvePrivateServiceAction, true);

        // route services
        container.get(ServicesResolveLifeScope)
            .use(ResolveRouteServicesAction, true);

        container.get(IocResolveScope)
            .use(RouteResolveAction, true);

        // design register route.
        container.get(DesignLifeScope)
            .use(RouteDesignRegisterAction);

        // runtime register route.
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


        container.register(SelectorManager);
        container.get(ActionRegisterer)
            .register(container, RegSelectorAction)
            .register(container, BindInputPropertyTypeAction)
            .register(container, BindInputParamTypeAction);

        container.get(DesignDecoratorRegisterer).register(Component, DecoratorScopes.Class,
            RegSelectorAction);
        container.get(DesignDecoratorRegisterer).register(Input, DecoratorScopes.Property,
            BindInputPropertyTypeAction);

        container.get(RuntimeDecoratorRegisterer).register(Input, DecoratorScopes.Parameter,
            BindInputParamTypeAction);

    }
}
