import { IContainer, ModuleDecoratorRegisterer } from '@tsdi/core';
import { Bootstrap } from './decorators/Bootstrap';
import * as annotations from './annotations';
import * as runnable from './runnable';
import * as services from './services';
import {
    BindProviderAction, IocSetCacheAction, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction,
} from '@tsdi/ioc';
import { DIModuleRegisterScope } from './core';
import { BuilderService } from './builder';


export function bootSetup(container: IContainer) {

    container.register(BuilderService);
    container.use(annotations, runnable, services);

    container.get(DesignDecoratorRegisterer)
        .register(Bootstrap, DecoratorScopes.Class, BindProviderAction);

    container.get(RuntimeDecoratorRegisterer)
        .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

    container.get(ModuleDecoratorRegisterer)
        .register(Bootstrap, DIModuleRegisterScope);
}
