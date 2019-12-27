import {  ActionInjectorToken } from '@tsdi/ioc';
import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { InjectLifeScope } from './injectors/InjectLifeScope';
import { ServiceResolveLifeScope } from './resolves/service/ServiceResolveLifeScope';
import { ServicesResolveLifeScope } from './resolves/services/ServicesResolveLifeScope';



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

}
