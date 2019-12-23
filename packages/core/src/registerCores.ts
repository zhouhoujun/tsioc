import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { IocExt } from './decorators/IocExt';
import {
    IocAutorunAction, DecoratorScopes, RegisterSingletionAction,
    RuntimeRegisterer, DesignRegisterer, ActionInjectorToken
} from '@tsdi/ioc';
import { InjectLifeScope } from './injectors/InjectLifeScope';
import { ServiceResolveLifeScope } from './resolves/ServiceResolveLifeScope';
import { ServicesResolveLifeScope } from './resolves/ServicesResolveLifeScope';



export function registerCores(container: IContainer) {

    container.registerValue(ContainerToken, container);
    if (!container.has(ModuleLoader)) {
        container.register(ModuleLoader);
    }

    let actInjector = container.get(ActionInjectorToken);

    // register action
    actInjector.register(InjectLifeScope)
        .register(ServiceResolveLifeScope)
        .register(ServicesResolveLifeScope);

    actInjector.getInstance(RuntimeRegisterer)
        .register(IocExt, DecoratorScopes.Class, RegisterSingletionAction);

    actInjector.getInstance(DesignRegisterer)
        .register(IocExt, DecoratorScopes.AfterAnnoation, IocAutorunAction);

}
