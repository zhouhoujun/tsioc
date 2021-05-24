import { CONTAINER, IContainer, Inject, IocExt, MODULE_LOADER, ServicesProvider } from '@tsdi/ioc';
import { ModuleLoader } from './services/loader';
import { Services } from './services/providers';
import { ResolveServicesScope } from './resolves/actions';

@IocExt()
export class CoreModule {

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) container: IContainer) {
        if (!container.has(MODULE_LOADER)) {
            container.setValue(MODULE_LOADER, new ModuleLoader(), ModuleLoader);
        }
        container.setValue(ServicesProvider, new Services(container));

        // register action
        container.action().regAction(ResolveServicesScope);
    }
}