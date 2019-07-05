import { IContainer } from '@tsdi/core';
import { Bootstrap } from './decorators/Bootstrap';
import * as annotations from './annotations';
import * as runnable from './runnable';
import * as services from './services';
import {
    BindProviderAction, IocSetCacheAction, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction
} from '@tsdi/ioc';
import { DIModuleInjectorScope } from './core';
import { BuilderService } from './builder';
import { ContextScope } from './ContextScope';


export function bootSetup(container: IContainer) {
    container.register(ContextScope);
    container.register(BuilderService);
    container.use(annotations, runnable, services);

    container.get(DesignDecoratorRegisterer)
        .register(Bootstrap, DecoratorScopes.Class, BindProviderAction)
        .register(Bootstrap, DecoratorScopes.Injector, DIModuleInjectorScope);

    container.get(RuntimeDecoratorRegisterer)
        .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

}
