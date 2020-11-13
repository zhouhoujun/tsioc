import { INJECTOR_FACTORY } from '@tsdi/ioc';
import { IContainer } from './link';
import { ModuleLoader } from './services/loader';
import { InjLifeScope } from './injects/lifescope';
import { ResolveServiceScope, ResolveServicesScope } from './resolves/actions';
import { ServiceProvider } from './services/providers';
import { CoreInjector } from './injector';
import { CONTAINER, MODULE_LOADER } from './tk';


export function registerCores(container: IContainer) {

    container.setValue(CONTAINER, container);
    if (!container.has(MODULE_LOADER)) {
        container.setValue(MODULE_LOADER, new ModuleLoader(), ModuleLoader);
    }

    container.set(INJECTOR_FACTORY, () => new CoreInjector(container), CoreInjector);
    container.setValue(ServiceProvider, new ServiceProvider(container));

    // register action
    container.provider
        .regAction(InjLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
