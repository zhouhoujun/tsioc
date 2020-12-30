import { CONTAINER, IContainer, Inject, IocExt, MODULE_LOADER, SERVICE_PROVIDER } from '@tsdi/ioc';
import { ModuleLoader } from './services/loader';
import { ServiceProvider } from './services/providers';
import { InjLifeScope } from './injects/lifescope';
import { ResolveServiceScope, ResolveServicesScope } from './resolves/actions';

@IocExt()
export class CoreModule {

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        if (!container.has(MODULE_LOADER)) {
            container.setValue(MODULE_LOADER, new ModuleLoader(container), ModuleLoader);
        }
        container.setValue(SERVICE_PROVIDER, new ServiceProvider(container));
    
        // register action
        container.provider.regAction(InjLifeScope,
                ResolveServiceScope,
                ResolveServicesScope);
    }
}