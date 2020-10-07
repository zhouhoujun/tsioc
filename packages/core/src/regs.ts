import { InjectorFactoryToken } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { ModuleLoader } from './services/loader';
import { InjLifeScope } from './injects/lifescope';
import { ResolveServiceScope, ResolveServicesScope } from './resolves/actions';
import { ServiceProvider } from './services/providers';
import { CoreInjector } from './CoreInjector';
import { ContainerToken } from './tk';


export function registerCores(container: IContainer) {

    container.setSingleton(ContainerToken, container);
    if (!container.has(ModuleLoader)) {
        container.setSingleton(ModuleLoader, new ModuleLoader());
    }

    let fac = container.getProxy();
    container.set(InjectorFactoryToken, () => new CoreInjector(fac), CoreInjector);
    container.setSingleton(ServiceProvider, new ServiceProvider(fac));

    let actInjector = container.getActionInjector();
    // register action
    actInjector.regAction(InjLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
