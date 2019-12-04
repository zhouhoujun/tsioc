import {
    Inject, BindProviderAction, IocSetCacheAction, DesignLifeScope, IocBeforeConstructorScope,
    IocAfterConstructorScope, DecoratorScopes, RuntimeMethodScope, RuntimePropertyScope,
    RuntimeAnnoationScope, IocAutorunAction, RegisterSingletionAction, IocResolveScope,
    ActionRegisterer, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import {
    IContainer, ContainerToken, IocExt, ResolvePrivateServiceAction, ResolveServiceInClassChain,
    ServicesResolveLifeScope, TypesRegisterScope, IocExtRegisterScope
} from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import { Message } from './decorators/Message';
import { AnnotationService } from './AnnotationService';
import { MessageContext } from './messages/MessageContext';
import { MessageQueue } from './messages/MessageQueue';
import { ModuleInjectLifeScope, DIModuleInjectorScope } from './injectors/ModuleInjectLifeScope';
import { RegForInjectorAction } from './injectors/RegForInjectorAction';
import { MessageRegisterAction } from './registers/MessageRegisterAction';
import { AnnoationDesignAction } from './registers/AnnoationDesignAction';
import { ResolveRouteServiceAction } from './resolves/ResolveRouteServiceAction';
import { ResolveRouteServicesAction } from './resolves/ResolveRouteServicesAction';
import { RouteResolveAction } from './resolves/RouteResolveAction';
import { RouteDesignRegisterAction, RouteRuntimRegisterAction } from './registers/RouteRegisterAction';


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

        container.inject(MessageContext, MessageQueue);


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
