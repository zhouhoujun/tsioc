import { InjectorFactoryToken } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { ModuleLoader } from './services/ModuleLoader';
import { InjLifeScope } from './injects/lifescope';
import { ResolveServiceScope, ResolveServicesScope } from './resolves/actions';
import { ModuleProvider } from './services/ModuleProvider';
import { ServiceProvider } from './services/ServiceProvider';
import { CoreInjector } from './CoreInjector';
import { ContainerToken } from './tk';


export function registerCores(container: IContainer) {

    container.setValue(ContainerToken, container);
    if (!container.has(ModuleLoader)) {
        container.setSingleton(ModuleLoader, new ModuleLoader());
    }

    let fac = container.getProxy();
    container.set(InjectorFactoryToken, () => new CoreInjector(fac), CoreInjector);
    container.setSingleton(ModuleProvider, new ModuleProvider(fac));
    container.setSingleton(ServiceProvider, new ServiceProvider(fac));

    let actInjector = container.getActionInjector();
    // register action
    actInjector.regAction(InjLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
