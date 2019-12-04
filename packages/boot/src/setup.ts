import {
    BindProviderAction, IocSetCacheAction, Inject, DecoratorScopes, RegisterSingletionAction, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Bootstrap } from './decorators/Bootstrap';
import { DIModuleInjectorScope } from './core';
import { BuilderService } from './builder/BuilderService';
import { ConfigureManager } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { RootMessageQueue } from './services/RootMessageQueue';
import { StartupServices } from './services/StartupServices';


@IocExt('setup')
export class BootSetup {

    setup(@Inject(ContainerToken) container: IContainer) {
        container.inject(BuilderService, ConfigureManager, BaseTypeParser, RootMessageQueue, StartupServices);
        container.getInstance(DesignRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, BindProviderAction)
            .register(Bootstrap, DecoratorScopes.Injector, DIModuleInjectorScope);

        container.getInstance(RuntimeRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

    }
}
