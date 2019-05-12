import { IContainer, ContainerToken } from './IContainer';
import {
    ModuleLoader, ServicesResolveLifeScope, ServiceResolveLifeScope,
    InjectorLifeScope, ServiceDecoratorRegisterer
} from './services';
import { IocExt } from './decorators';
import {
    RuntimeDecoratorRegisterer, IocAutorunAction, DecoratorScopes,
    RegisterSingletionAction, DesignDecoratorRegisterer, ActionRegisterer
} from '@tsdi/ioc';



export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, () => container);
    if (!container.has(ModuleLoader)) {
        container.register(ModuleLoader);
    }

    container.register(ServiceDecoratorRegisterer);
    // register action
    container.actions
        .register(container, InjectorLifeScope, true)
        .register(container, ServiceResolveLifeScope, true)
        .register(container, ServicesResolveLifeScope, true);

    container.get(RuntimeDecoratorRegisterer)
        .register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);

    container.get(DesignDecoratorRegisterer)
        .register(IocExt, DecoratorScopes.Class, IocAutorunAction);

}
