import { INJECTOR_FACTORY } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { ModuleLoader } from './services/loader';
import { InjLifeScope } from './injects/lifescope';
import { ResolveServiceScope, ResolveServicesScope } from './resolves/actions';
import { ServiceProvider } from './services/providers';
import { CoreInjector } from './CoreInjector';
import { CONTAINER } from './tk';


export function registerCores(container: IContainer) {

    container.setValue(CONTAINER, container);
    if (!container.has(ModuleLoader)) {
        container.setValue(ModuleLoader, new ModuleLoader());
    }

    let fac = container.getProxy();
    container.set(INJECTOR_FACTORY, () => new CoreInjector(fac), CoreInjector);
    container.setValue(ServiceProvider, new ServiceProvider(fac));

    let actInjector = container.getActionInjector();
    // register action
    actInjector.regAction(InjLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
