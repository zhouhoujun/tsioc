import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Bootstrap } from './decorators/Bootstrap';
import * as annotations from './annotations';
import * as runnable from './runnable';
import * as services from './services';
import {
    BindProviderAction, IocSetCacheAction, Inject, DecoratorScopes, RegisterSingletionAction
} from '@tsdi/ioc';
import { DIModuleInjectorScope } from './core';
import { BuilderService } from './builder';


@IocExt('setup')
export class BootSetup {

    setup(@Inject(ContainerToken) container: IContainer) {
        container.register(BuilderService);
        container.use(annotations, runnable, services);

        container.getDesignRegisterer()
            .register(Bootstrap, DecoratorScopes.Class, BindProviderAction)
            .register(Bootstrap, DecoratorScopes.Injector, DIModuleInjectorScope);

        container.getRuntimeRegisterer()
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

    }
}
