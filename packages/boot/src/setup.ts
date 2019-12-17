import {
    BindProviderAction, IocSetCacheAction, Inject, DecoratorScopes, RegisterSingletionAction,
    DesignRegisterer, RuntimeRegisterer, ActionInjectorToken
} from '@tsdi/ioc';
import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Bootstrap } from './decorators/Bootstrap';
import { DIModuleInjectScope } from './core';
import { BuilderService } from './builder/BuilderService';
import { ConfigureManager } from './annotations/ConfigureManager';
import { BaseTypeParser } from './services/BaseTypeParser';
import { RootMessageQueue } from './services/RootMessageQueue';
import { StartupServices } from './services/StartupServices';


@IocExt('setup')
export class BootSetup {

    setup(@Inject(ContainerToken) container: IContainer) {
        container.inject(BuilderService, ConfigureManager, BaseTypeParser, RootMessageQueue, StartupServices);
        let actInjector = container.get(ActionInjectorToken);
        actInjector.getInstance(DesignRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, BindProviderAction)
            .register(Bootstrap, DecoratorScopes.Injector, DIModuleInjectScope);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

    }
}
