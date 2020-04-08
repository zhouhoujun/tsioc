import {
    Inject, TypeProviderAction, IocSetCacheAction, IocAutorunAction, IocExt,
    RegSingletionAction, DesignRegisterer, RuntimeRegisterer, DecoratorScope
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { DIModule } from './decorators/DIModule';
import { Annotation } from './decorators/Annotation';
import { Message } from './decorators/Message';
import { MessageContext } from './messages/MessageContext';
import { MessageQueue } from './messages/MessageQueue';
import { RootMessageQueue } from './messages/RootMessageQueue';
import { InjDIModuleScope } from './registers/InjDIModuleScope';
import { MessageRegisterAction } from './registers/MessageRegisterAction';
import { AnnoationAction, AnnoationRegInAction, AnnoationRegisterScope} from './registers/module_actions';
import { Bootstrap } from './decorators/Bootstrap';
import { ConfigureManager } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { StartupDecoratorRegisterer } from './handles/StartupDecoratorRegisterer';
import { ModuleInjector, ModuleProviders } from './modules/ModuleInjector';
import { ResolveMoudleScope } from './builder/build-hanles';
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

        container.set(ModuleInjector, () => new ModuleInjector(container.getProxy()));
        container.set(ModuleProviders, () => new ModuleProviders(container.getProxy()));
        let actInjector = container.getActionInjector();

        actInjector.setValue(StartupDecoratorRegisterer, new StartupDecoratorRegisterer(actInjector))
            .regAction(AnnoationRegisterScope)
            .regAction(InjDIModuleScope)
            .regAction(ResolveMoudleScope)
            .regAction(RunnableBuildLifeScope)
            .regAction(BootLifeScope);

        let desgReger = actInjector.getInstance(DesignRegisterer);
        registerModule(DIModule, desgReger);
        registerModule(Bootstrap, desgReger);

        desgReger.register(Annotation,
            { scope: cls, action: [TypeProviderAction, AnnoationAction] },
            { scope: aftAnn, action: IocAutorunAction }
        )
            .register(Message,
                { scope: cls, action: TypeProviderAction },
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
        { scope: 'Inj', action: InjDIModuleScope },
        { scope: 'BeforeAnnoation', action: AnnoationRegInAction },
        { scope: cls, action: AnnoationAction },
        { scope: 'Annoation', action: AnnoationRegisterScope },
        { scope: aftAnn, action: IocAutorunAction }
    );
}
