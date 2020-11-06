import { Inject, IocExt } from '@tsdi/ioc';
import { IContainer, CONTAINER, InjModuleScope } from '@tsdi/core';
import { MessageContext } from './messages/ctx';
import { MessageQueue, RootMessageQueue } from './messages/queue';
import { InjDIModuleScope } from './registers/Inj-module';
import { ConfigureManager, ConfigureMerger } from './configure/manager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { BuilderService } from './services/BuilderService';
import { ModuleInjector, ModuleProviders } from './modules/injector';
import { ResolveMoudleScope } from './builder/handles';
import { RunnableBuildLifeScope, BootLifeScope, StartupServiceScope } from './boot/lifescope';
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
        container.set(ModuleInjector, () => new ModuleInjector(container));
        container.set(ModuleProviders, () => new ModuleProviders(container));
        let actInjector = container.getActionInjector();

        actInjector.regAction(ResolveMoudleScope)
            .regAction(StartupServiceScope)
            .regAction(RunnableBuildLifeScope)
            .regAction(BootLifeScope);

        actInjector.getInstance(InjModuleScope)
            .useBefore(InjDIModuleScope);

        container.inject(BuildContext, BootContext, BuilderService, ConfigureMerger, ConfigureManager, BaseTypeParser, RootMessageQueue, MessageContext, MessageQueue);


    }
}
