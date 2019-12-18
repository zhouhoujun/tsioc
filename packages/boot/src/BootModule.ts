import {
    Inject, BindProviderAction, IocSetCacheAction, DecoratorScopes, IocAutorunAction,
    RegisterSingletionAction, DesignRegisterer, RuntimeRegisterer, ActionInjectorToken
} from '@tsdi/ioc';
import { IContainer, ContainerToken, IocExt, TypesRegisterScope, IocExtRegisterScope } from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import { Message } from './decorators/Message';
import { AnnotationService } from './services/AnnotationService';
import { MessageContext } from './messages/MessageContext';
import { MessageQueue } from './messages/MessageQueue';
import { ModuleInjectLifeScope, DIModuleInjectScope } from './injectors/ModuleInjectLifeScope';
import { InjectForAction } from './injectors/InjectForAction';
import { MessageRegisterAction } from './registers/MessageRegisterAction';
import { AnnoationDesignAction } from './registers/AnnoationDesignAction';
import { Bootstrap } from './decorators/Bootstrap';
import { BuilderService } from './builder/BuilderService';
import { ConfigureManager } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { RootMessageQueue } from './services/RootMessageQueue';
import { StartupServices } from './services/StartupServices';
import { StartupDecoratorRegisterer } from './handles/StartupDecoratorRegisterer';


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

        actInjector.registerValue(StartupDecoratorRegisterer, new StartupDecoratorRegisterer(actInjector))
            .register(ModuleInjectLifeScope)
            .register(DIModuleInjectScope)
            .register(InjectForAction)
            .register(MessageRegisterAction)
            .register(AnnoationDesignAction);

        // inject module
        actInjector.get(TypesRegisterScope)
            .useBefore(InjectForAction);
        actInjector.get(IocExtRegisterScope)
            .useBefore(InjectForAction);

        actInjector.getInstance(DesignRegisterer)
            .register(DIModule, DecoratorScopes.Injector, DIModuleInjectScope)
            .register(Annotation, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, IocAutorunAction)
            .register(DIModule, DecoratorScopes.Class, BindProviderAction, AnnoationDesignAction, IocAutorunAction)
            .register(Message, DecoratorScopes.Class, BindProviderAction, IocAutorunAction, MessageRegisterAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Annotation, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(DIModule, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(Message, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.inject(MessageContext, MessageQueue);


        container.inject(BuilderService, ConfigureManager, BaseTypeParser, RootMessageQueue, StartupServices);
        actInjector.getInstance(DesignRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, BindProviderAction)
            .register(Bootstrap, DecoratorScopes.Injector, DIModuleInjectScope);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

    }
}
