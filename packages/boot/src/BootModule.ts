import { Inject, IocExt, DesignRegisterer, DecoratorScope } from '@tsdi/ioc';
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
import { RunnableBuildLifeScope, BootLifeScope } from './boot/lifescope';
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

        desgReger.register(Message, { scope: aftAnn, action: MessageRegisterAction })
            .register(Boot, { scope: aftAnn, action: StartupRegisterAction });


        container.inject(BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser, RootMessageQueue, MessageContext, MessageQueue);

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
        { scope: 'Annoation', action: AnnoationRegisterScope }
    );
}
