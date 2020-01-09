import { ActionInjectorToken, ContainerProxyToken, InjectorFactoryToken } from '@tsdi/ioc';
import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { InjectLifeScope } from './injectors/InjectLifeScope';
import { ResolveServiceScope } from './resolves/service/ResolveServiceScope';
import { ResolveServicesScope } from './resolves/services/ResolveServicesScope';
import { ModuleProvider } from './services/ModuleProvider';
import { ServiceProvider } from './services/ServiceProvider';
import { CoreInjector } from './CoreInjector';


export function registerCores(container: IContainer) {

    container.registerValue(ContainerToken, container);
    if (!container.has(ModuleLoader)) {
        container.registerType(ModuleLoader);
    }

    let fac = container.get(ContainerProxyToken);
    container.set(InjectorFactoryToken, () => new CoreInjector(fac), CoreInjector);
    container.registerValue(ModuleProvider, new ModuleProvider(fac));
    container.registerValue(ServiceProvider, new ServiceProvider(fac));

    let actInjector = container.get(ActionInjectorToken);
    // register action
    actInjector.regAction(InjectLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
