import {
    Inject, BindProviderAction, IocSetCacheAction, DecoratorScopes, IocAutorunAction,
    RegisterSingletionAction, DesignRegisterer, RuntimeRegisterer, ActionInjectorToken, IActionInjector
} from '@tsdi/ioc';
import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import { Message } from './decorators/Message';
import { MessageContext } from './messages/MessageContext';
import { MessageQueue } from './messages/MessageQueue';
import { RootMessageQueue } from './messages/RootMessageQueue';
import { DIModuleInjectScope } from './injectors/DIModuleInjectScope';
import { MessageRegisterAction } from './registers/MessageRegisterAction';
import { AnnoationDesignAction } from './registers/AnnoationDesignAction';
import { Bootstrap } from './decorators/Bootstrap';
import { BuilderService } from './builder/BuilderService';
import { ConfigureManager } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { StartupServices } from './services/StartupServices';
import { StartupDecoratorRegisterer } from './handles/StartupDecoratorRegisterer';
import { ModuleInjector } from './modules/ModuleInjector';
import { AnnoationInjectorCheck } from './registers/AnnoationInjectorCheck';
import { AnnoationRegisterAction } from './registers/AnnoationRegisterAction';


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

        container.register(ModuleInjector, () => new ModuleInjector(container.getFactory()));
        let actInjector = container.get(ActionInjectorToken);

        actInjector.registerValue(StartupDecoratorRegisterer, new StartupDecoratorRegisterer(actInjector))
            .register(DIModuleInjectScope)
            .register(MessageRegisterAction)
            .register(AnnoationDesignAction);

        let desgReger = actInjector.getInstance(DesignRegisterer);
        registerModule(DIModule, desgReger);
        registerModule(Bootstrap, desgReger);
        desgReger.register(Annotation,
            { scope: DecoratorScopes.Class, action: [BindProviderAction, AnnoationDesignAction] },
            { scope: DecoratorScopes.AfterAnnoation, action: IocAutorunAction }
        )
            .register(Message,
                { scope: DecoratorScopes.Class, action: BindProviderAction },
                { scope: DecoratorScopes.AfterAnnoation, action: [IocAutorunAction, MessageRegisterAction] }
            );

        actInjector.getInstance(RuntimeRegisterer)
            .register(Annotation, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(DIModule, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction)
            .register(Message, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.inject(MessageContext, MessageQueue);


        container.inject(BuilderService, ConfigureManager, BaseTypeParser, RootMessageQueue, StartupServices);


        actInjector.getInstance(RuntimeRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

    }
}

/**
 * register decorator as module.
 * @param decorator decorator.
 * @param registerer design registerer.
 */
export function registerModule(decorator: string | Function, registerer: DesignRegisterer): DesignRegisterer {
    return registerer.register(decorator,
        { scope: DecoratorScopes.Inject, action: DIModuleInjectScope },
        { scope: DecoratorScopes.BeforeAnnoation, action: AnnoationInjectorCheck },
        { scope: DecoratorScopes.Class, action: [BindProviderAction, AnnoationDesignAction] },
        { scope: DecoratorScopes.Annoation, action: AnnoationRegisterAction },
        { scope: DecoratorScopes.AfterAnnoation, action: IocAutorunAction }
    );
}
