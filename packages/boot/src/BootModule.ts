import {
    Inject, BindProviderAction, IocSetCacheAction, DecoratorScopes, IocAutorunAction, IocExt,
    RegisterSingletionAction, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
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
import { ConfigureManager } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { StartupServices } from './services/StartupServices';
import { BuilderService } from './services/BuilderService';
import { StartupDecoratorRegisterer } from './handles/StartupDecoratorRegisterer';
import { ModuleInjector, ModuleProviders } from './modules/ModuleInjector';
import { AnnoationInjectorCheck } from './registers/AnnoationInjectorCheck';
import { AnnoationRegisterScope } from './registers/AnnoationRegisterScope';
import { ResolveMoudleScope } from './builder/resolvers/ResolveMoudleScope';
import { RunnableBuildLifeScope } from './boots/RunnableBuildLifeScope';
import { BootLifeScope } from './boots/BootLifeScope';
import { BuildContext } from './builder/BuildContext';


/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt()
export class BootModule {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {

        container.set(ModuleInjector, () => new ModuleInjector(container.getContainerProxy()));
        container.set(ModuleProviders, () => new ModuleProviders(container.getContainerProxy()));
        let actInjector = container.getActionInjector();

        actInjector.setValue(StartupDecoratorRegisterer, new StartupDecoratorRegisterer(actInjector))
            .regAction(AnnoationRegisterScope)
            .regAction(DIModuleInjectScope)
            .regAction(ResolveMoudleScope)
            .regAction(RunnableBuildLifeScope)
            .regAction(BootLifeScope);

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

        container.inject(BuildContext, BuilderService, ConfigureManager, BaseTypeParser, RootMessageQueue, StartupServices, MessageContext, MessageQueue);

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
        { scope: DecoratorScopes.Annoation, action: AnnoationRegisterScope },
        { scope: DecoratorScopes.AfterAnnoation, action: IocAutorunAction }
    );
}
