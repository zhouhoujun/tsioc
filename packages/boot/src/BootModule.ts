import { Inject, IocExt, DesignRegisterer, DecoratorScope } from '@tsdi/ioc';
import { IContainer, CONTAINER, InjModuleScope } from '@tsdi/core';
import { DIModule, Message, Boot, Bootstrap } from './decorators';
import { MessageContext } from './messages/ctx';
import { MessageQueue, RootMessageQueue } from './messages/queue';
import { InjDIModuleScope } from './registers/Inj-module';
import { MessageRegisterAction } from './registers/message';
import { AnnoationRegInAction, AnnoationRegisterScope } from './registers/module';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { ModuleInjector, ModuleProviders } from './modules/injector';
import { ResolveMoudleScope } from './builder/handles';
import { RunnableBuildLifeScope, BootLifeScope, StartupServiceScope } from './boot/lifescope';
import { StartupRegisterAction } from './registers/startup'
import { BuildContext } from './builder/ctx';
import { BootContext } from './boot/ctx';


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
    setup(@Inject(CONTAINER) container: IContainer) {
        const proxy = container.getProxy();
        container.set(ModuleInjector, () => new ModuleInjector(proxy));
        container.set(ModuleProviders, () => new ModuleProviders(proxy));
        let actInjector = container.getActionInjector();

        actInjector.regAction(AnnoationRegisterScope)
            .regAction(ResolveMoudleScope)
            .regAction(StartupServiceScope)
            .regAction(RunnableBuildLifeScope)
            .regAction(BootLifeScope);

        actInjector.getInstance(InjModuleScope)
            .useBefore(InjDIModuleScope);

        let desgReger = actInjector.getInstance(DesignRegisterer);
        registerModule(DIModule, desgReger);
        registerModule(Bootstrap, desgReger);

        desgReger.register(Message, { scope: aftAnn, action: MessageRegisterAction })
            .register(Boot, { scope: aftAnn, action: StartupRegisterAction });

        container.inject(BuildContext, BootContext, BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser, RootMessageQueue, MessageContext, MessageQueue);


    }
}


const aftAnn: DecoratorScope = 'AfterAnnoation';

/**
 * register decorator as module.
 * @param decorator decorator.
 * @param registerer design registerer.
 */
export function registerModule(decorator: string | Function, registerer: DesignRegisterer): DesignRegisterer {
    return registerer.register(decorator,
        { scope: 'BeforeAnnoation', action: AnnoationRegInAction },
        { scope: 'Annoation', action: AnnoationRegisterScope }
    );
}
