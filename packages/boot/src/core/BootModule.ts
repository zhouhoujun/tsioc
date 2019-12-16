import {
    Inject, BindProviderAction, IocSetCacheAction, DesignLifeScope, IocBeforeConstructorScope,
    IocAfterConstructorScope, DecoratorScopes, RuntimeMethodScope, RuntimePropertyScope,
    RuntimeAnnoationScope, IocAutorunAction, RegisterSingletionAction, IocResolveScope,
    DesignRegisterer, RuntimeRegisterer, ActionInjectorToken
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
        let actInjector = container.get(ActionInjectorToken);

        actInjector
            .register(ModuleInjectLifeScope)
            .register(DIModuleInjectorScope)
            .register(RegForInjectorAction)
            .register(MessageRegisterAction)
            .register(AnnoationDesignAction);

        // inject module
        actInjector.get(TypesRegisterScope)
            .useBefore(RegForInjectorAction);
        actInjector.get(IocExtRegisterScope)
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
        actInjector.get(ResolveServiceInClassChain)
            .useAfter(ResolveRouteServiceAction, ResolvePrivateServiceAction);

        // route services
        actInjector.get(ServicesResolveLifeScope)
            .use(ResolveRouteServicesAction);

        actInjector.get(IocResolveScope)
            .use(RouteResolveAction);

        // design register route.
        actInjector.get(DesignLifeScope)
            .use(RouteDesignRegisterAction);

        // runtime register route.
        actInjector.get(IocBeforeConstructorScope)
            .use(RouteRuntimRegisterAction);

        actInjector.get(IocAfterConstructorScope)
            .use(RouteRuntimRegisterAction);

        actInjector.get(RuntimePropertyScope)
            .use(RouteRuntimRegisterAction);

        actInjector.get(RuntimeMethodScope)
            .use(RouteRuntimRegisterAction);

        actInjector.get(RuntimeAnnoationScope)
            .use(RouteRuntimRegisterAction);

    }
}
