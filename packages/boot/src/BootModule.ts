import {
    Inject, TypeProviderAction, IocSetCacheAction, IocAutorunAction, IocExt,
    RegSingletionAction, DesignRegisterer, RuntimeRegisterer, DecoratorScope
} from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { DIModule, Message, Boot, Bootstrap } from './decorators';
import { MessageContext } from './messages/ctx';
import { MessageQueue, RootMessageQueue } from './messages/queue';
import { InjDIModuleScope } from './registers/Inj-module';
import { MessageRegisterAction } from './registers/message';
import { AnnoationAction, AnnoationRegInAction, AnnoationRegisterScope } from './registers/module';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { StartupDecoratorRegisterer } from './handles/register';
import { ModuleInjector, ModuleProviders } from './modules/injector';
import { ResolveMoudleScope } from './builder/handles';
import { RunnableBuildLifeScope, BootLifeScope } from './boots/lifescope';
import { BuildContext } from './builder/ctx';
import { StartupRegisterAction } from './registers/startup';


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
