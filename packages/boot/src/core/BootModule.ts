import {
    Inject, BindProviderAction, DesignDecoratorRegisterer,
    IocSetCacheAction, RuntimeDecoratorRegisterer, DesignLifeScope,
    IocBeforeConstructorScope, IocAfterConstructorScope, DecoratorScopes, RuntimeMethodScope,
    RuntimePropertyScope, RuntimeAnnoationScope, IocAutorunAction,
    RegisterSingletionAction, IocResolveScope
} from '@tsdi/ioc';
import {
    IContainer, ContainerToken, IocExt,
    ResolvePrivateServiceAction, ResolveServiceInClassChain,
    InjectorDecoratorRegisterer, ServicesResolveLifeScope
} from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';

import { RouteResolveAction, ResolveRouteServiceAction, ResolveRouteServicesAction } from './resolves';
import { RouteDesignRegisterAction, RouteRuntimRegisterAction, ComponentRegisterAction, BindingPropertyTypeAction, BindingParamTypeAction } from './registers';
import { DIModuleInjectorScope, DIModuleExports, ModuleInjectLifeScope, RegForInjectorAction } from './injectors';
import { SelectorManager } from './SelectorManager';
import { Input, Component, RegisterFor } from './decorators';
import { BuildHandleRegisterer } from './handles';
import { ComponentManager } from './ComponentManager';
import { ModuleDecoratorService } from './ModuleDecoratorService';


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

        container.register(BuildHandleRegisterer);
        container.register(ModuleDecoratorService);
        let designReg = container.get(DesignDecoratorRegisterer);
        designReg.register(Annotation, DecoratorScopes.Class, BindProviderAction, IocAutorunAction);
        designReg.register(DIModule, DecoratorScopes.Class, BindProviderAction, IocAutorunAction);
        designReg.register(Component, DecoratorScopes.Class, BindProviderAction)

        container.get(RuntimeDecoratorRegisterer)
            .register(Component, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(Annotation, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(DIModule, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.use(modules);
        container.register(DIModuleExports);

        let registerer = container.getActionRegisterer();

        registerer
            .register(container, ModuleInjectLifeScope, true)
            .register(container, DIModuleInjectorScope, true)
            .register(container, RegForInjectorAction);

        container.get(InjectorDecoratorRegisterer)
            .register(DIModule, DIModuleInjectorScope)
            .register(RegisterFor, RegForInjectorAction);


        // route service
        registerer.get(ResolveServiceInClassChain)
            .useAfter(ResolveRouteServiceAction, ResolvePrivateServiceAction, true);

        // route services
        registerer.get(ServicesResolveLifeScope)
            .use(ResolveRouteServicesAction, true);

        registerer.get(IocResolveScope)
            .use(RouteResolveAction, true);

        // design register route.
        registerer.get(DesignLifeScope)
            .use(RouteDesignRegisterAction);

        // runtime register route.
        registerer.get(IocBeforeConstructorScope)
            .use(RouteRuntimRegisterAction);

        registerer.get(IocAfterConstructorScope)
            .use(RouteRuntimRegisterAction);

        registerer.get(RuntimePropertyScope)
            .use(RouteRuntimRegisterAction);

        registerer.get(RuntimeMethodScope)
            .use(RouteRuntimRegisterAction);

        registerer.get(RuntimeAnnoationScope)
            .use(RouteRuntimRegisterAction);

        container.register(SelectorManager)
            .register(ComponentManager);
        registerer
            .register(container, ComponentRegisterAction)
            .register(container, BindingPropertyTypeAction)
            .register(container, BindingParamTypeAction);

        container.get(DesignDecoratorRegisterer)
            .register(Component, DecoratorScopes.Class, ComponentRegisterAction)
            .register(Input, DecoratorScopes.Property, BindingPropertyTypeAction);

        container.get(RuntimeDecoratorRegisterer)
            .register(Input, DecoratorScopes.Parameter, BindingParamTypeAction);

    }
}
