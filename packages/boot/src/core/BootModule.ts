import {
    Inject, BindProviderAction, IocSetCacheAction, DesignLifeScope,
    IocBeforeConstructorScope, IocAfterConstructorScope, DecoratorScopes, RuntimeMethodScope,
    RuntimePropertyScope, RuntimeAnnoationScope, IocAutorunAction,
    RegisterSingletionAction, IocResolveScope, ActionRegisterer, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import {
    IContainer, ContainerToken, IocExt,
    ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ServicesResolveLifeScope, TypesRegisterScope, IocExtRegisterScope
} from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import * as modules from './modules';
import * as messages from './messages';

import { RouteResolveAction, ResolveRouteServiceAction, ResolveRouteServicesAction } from './resolves';
import { RouteDesignRegisterAction, RouteRuntimRegisterAction, MessageRegisterAction, AnnoationDesignAction } from './registers';
import { DIModuleInjectorScope, ModuleInjectLifeScope, RegForInjectorAction } from './injectors';
import { Message } from './decorators';
import { AnnotationService } from './AnnotationService';


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

        container.register(AnnotationService);
        let registerer = container.getInstance(ActionRegisterer);

        registerer
            .register(container, ModuleInjectLifeScope, true)
            .register(container, DIModuleInjectorScope, true)
            .register(container, RegForInjectorAction)
            .register(container, MessageRegisterAction)
            .register(container, AnnoationDesignAction);

        // inject module
        registerer.get(TypesRegisterScope)
            .useBefore(RegForInjectorAction);
        registerer.get(IocExtRegisterScope)
            .useBefore(RegForInjectorAction);

        container.getInstance(DesignRegisterer)
            .register(DIModule, DecoratorScopes.Injector, DIModuleInjectorScope)
            .register(Annotation, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, IocAutorunAction)
            .register(DIModule, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, IocAutorunAction)
            .register(Message, DecoratorScopes.Class, BindProviderAction, IocAutorunAction, MessageRegisterAction);

        container.getInstance(RuntimeRegisterer)
            .register(Annotation, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(DIModule, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(Message, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.use(modules, messages);


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

    }
}
