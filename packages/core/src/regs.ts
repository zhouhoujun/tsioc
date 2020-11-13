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

    container.set(INJECTOR_FACTORY, () => new CoreInjector(container), CoreInjector);
    container.setValue(ServiceProvider, new ServiceProvider(container));

    // register action
    container.provider
        .regAction(InjLifeScope)
        .regAction(ResolveServiceScope)
        .regAction(ResolveServicesScope);

}
