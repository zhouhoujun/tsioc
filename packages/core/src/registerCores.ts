import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { IocExt } from './decorators/IocExt';
import {
    IocAutorunAction, DecoratorScopes, RegisterSingletionAction, RuntimeRegisterer, DesignRegisterer, ActionInjectorToken
} from '@tsdi/ioc';
import { InjectorLifeScope } from './injectors/InjectorLifeScope';
import { ServiceResolveLifeScope } from './resolves/ServiceResolveLifeScope';
import { ServicesResolveLifeScope } from './resolves/ServicesResolveLifeScope';



export function registerCores(container: IContainer) {

    container.registerValue(ContainerToken, container);
    if (!container.has(ModuleLoader)) {
        container.register(ModuleLoader);
    }

    // register action
    container.get(ActionInjectorToken)
        .register(InjectorLifeScope)
        .register(ServiceResolveLifeScope)
        .register(ServicesResolveLifeScope);

    container.getInstance(RuntimeRegisterer)
        .register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);

    container.getInstance(DesignRegisterer)
        .register(IocExt, DecoratorScopes.Class, IocAutorunAction);

}
