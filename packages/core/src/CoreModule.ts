import { Container, Inject, IocExt, ModuleLoader, ServicesProvider } from '@tsdi/ioc';
import { ModuleLoaderImpl } from './services/loader';
import { Services } from './services/providers';
import { ResolveServicesScope } from './resolves/actions';

@IocExt()
export class CoreModule {

    /**
     * register aop for container.
     */
    setup(@Inject() container: Container) {
        if (!container.has(ModuleLoader)) {
            container.setValue(ModuleLoader, new ModuleLoaderImpl(), ModuleLoaderImpl);
        }
        container.setValue(ServicesProvider, new Services(container));

        // register action
        container.action().regAction(ResolveServicesScope);
    }
}