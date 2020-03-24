import { ContainerProxyToken, InjectorFactoryToken } from '@tsdi/ioc';
import { IContainer, ContainerToken } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { InjLifeScope } from './injects/InjLifeScope';
import { ResolveServiceScope } from './resolves/service-actions';
import { ResolveServicesScope } from './resolves/services-actions';
import { ModuleProvider } from './services/ModuleProvider';
import { ServiceProvider } from './services/ServiceProvider';
import { CoreInjector } from './CoreInjector';


export function registerCores(container: IContainer) {

    container.setValue(ContainerToken, container);
    if (!container.has(ModuleLoader)) {
        container.setValue(ModuleLoader, new ModuleLoader());
    }

    let fac = container.getInstance(ContainerProxyToken);
    container.set(InjectorFactoryToken, () => new CoreInjector(fac), CoreInjector);
    container.setValue(ModuleProvider, new ModuleProvider(fac));
    container.setValue(ServiceProvider, new ServiceProvider(fac));

    let actInjector = container.getActionInjector();
    // register action
    actInjector.regAction(InjLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
