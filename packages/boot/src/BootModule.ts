import {
    Inject, TypeProviderAction, IocSetCacheAction, IocAutorunAction, IocExt,
    RegSingletionAction, DesignRegisterer, RuntimeRegisterer, DecoratorScope
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { DIModule, Message, Boot, Bootstrap } from './decorators';
import { MessageContext } from './messages/MessageContext';
import { MessageQueue } from './messages/MessageQueue';
import { RootMessageQueue } from './messages/RootMessageQueue';
import { InjDIModuleScope } from './registers/InjDIModuleScope';
import { MessageRegisterAction } from './registers/MessageRegisterAction';
import { AnnoationAction, AnnoationRegInAction, AnnoationRegisterScope } from './registers/module_actions';
import { ConfigureManager, ConfigureMerger } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { StartupDecoratorRegisterer } from './handles/StartupDecoratorRegisterer';
import { ModuleInjector, ModuleProviders } from './modules/ModuleInjector';
import { ResolveMoudleScope } from './builder/build-hanles';
import { RunnableBuildLifeScope } from './boots/RunnableBuildLifeScope';
import { BootLifeScope } from './boots/BootLifeScope';
import { BuildContext } from './builder/BuildContext';
import { StartupRegisterAction } from './registers/StartupRegisterAction';


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
        const proxy = container.getProxy();
        container.set(ModuleInjector, () => new ModuleInjector(proxy));
        container.set(ModuleProviders, () => new ModuleProviders(proxy));
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

        desgReger.register(Message,
            { scope: cls, action: TypeProviderAction },
            { scope: aftAnn, action: [IocAutorunAction, MessageRegisterAction] }
        )
            .register(Boot,
                { scope: cls, action: TypeProviderAction },
                { scope: aftAnn, action: [IocAutorunAction, StartupRegisterAction] });

        actInjector.getInstance(RuntimeRegisterer)
            .register(DIModule, cls, RegSingletionAction, IocSetCacheAction)
            .register(Boot, cls, RegSingletionAction, IocSetCacheAction)
            .register(Message, cls, RegSingletionAction, IocSetCacheAction);

        container.inject(BuildContext, BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser, RootMessageQueue, MessageContext, MessageQueue);

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
