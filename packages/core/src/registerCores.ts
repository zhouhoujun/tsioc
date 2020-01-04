import {  ActionInjectorToken, IocContainerToken } from '@tsdi/ioc';
import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { InjectLifeScope } from './injectors/InjectLifeScope';
import { ServiceResolveLifeScope } from './resolves/service/ServiceResolveLifeScope';
import { ServicesResolveLifeScope } from './resolves/services/ServicesResolveLifeScope';


export function registerCores(container: IContainer) {

    container.bindProvider(ContainerToken, IocContainerToken);
    if (!container.has(ModuleLoader)) {
        container.registerType(ModuleLoader);
    }

    let actInjector = container.get(ActionInjectorToken);

    // register action
    actInjector.regAction(InjectLifeScope)
        .regAction(ServiceResolveLifeScope)
        .regAction(ServicesResolveLifeScope);

}
