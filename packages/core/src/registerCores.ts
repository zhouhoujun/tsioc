import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { IocExt } from './decorators/IocExt';
import {
    IocAutorunAction, DecoratorScopes, RegisterSingletionAction, ActionRegisterer, RuntimeRegisterer, DesignRegisterer
} from '@tsdi/ioc';
import { InjectorLifeScope } from './injectors/InjectorLifeScope';
import { ServiceResolveLifeScope } from './resolves/ServiceResolveLifeScope';
import { ServicesResolveLifeScope } from './resolves/ServicesResolveLifeScope';



export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, container.getFactory());
    if (!container.has(ModuleLoader)) {
        container.register(ModuleLoader);
    }

    // register action
    container.getInstance(ActionRegisterer)
        .register(container, InjectorLifeScope, true)
        .register(container, ServiceResolveLifeScope, true)
        .register(container, ServicesResolveLifeScope, true);

    container.getInstance(RuntimeRegisterer)
        .register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);

    container.getInstance(DesignRegisterer)
        .register(IocExt, DecoratorScopes.Class, IocAutorunAction);

}
