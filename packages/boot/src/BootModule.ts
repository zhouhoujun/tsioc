import {
    Inject, BindAnnoPdrAction, IocSetCacheAction, IocAutorunAction, IocExt,
    RegSingletionAction, DesignRegisterer, RuntimeRegisterer, DecoratorScope
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
            { scope: cls, action: [BindAnnoPdrAction, AnnoationDesignAction] },
            { scope: aftAnn, action: IocAutorunAction }
        )
            .register(Message,
                { scope: cls, action: BindAnnoPdrAction },
                { scope: aftAnn, action: [IocAutorunAction, MessageRegisterAction] }
            );

        actInjector.getInstance(RuntimeRegisterer)
            .register(Annotation, cls, RegSingletionAction, IocSetCacheAction)
            .register(DIModule, cls, RegSingletionAction, IocSetCacheAction)
            .register(Message, cls, RegSingletionAction, IocSetCacheAction);

        container.inject(BuildContext, BuilderService, ConfigureManager, BaseTypeParser, RootMessageQueue, MessageContext, MessageQueue);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Bootstrap, cls, RegSingletionAction, IocSetCacheAction);

    }
}

const cls: DecoratorScope = 'Class';
const aftAnn: DecoratorScope = 'AfterAnnoation';
/**
 * register decorator as module.
 * @param decorator decorator.
 * @param registerer design registerer.
 */
export function registerModule(decorator: string | Function, registerer: DesignRegisterer): DesignRegisterer {
    return registerer.register(decorator,
        { scope: 'Inject', action: DIModuleInjectScope },
        { scope: 'BeforeAnnoation', action: AnnoationInjectorCheck },
        { scope: cls, action: AnnoationDesignAction },
        { scope: 'Annoation', action: AnnoationRegisterScope },
        { scope: aftAnn, action: IocAutorunAction }
    );
}
