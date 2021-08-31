import { Container, Inject, IocExt, ServicesProvider } from '@tsdi/ioc';
import { Services } from './services/providers';
import { ResolveServicesScope } from './resolves/actions';

@IocExt()
export class CoreModule {

    /**
     * register aop for container.
     */
    setup(@Inject() container: Container) {
        container.setValue(ServicesProvider, new Services(container));
        // register action
        container.action().regAction(ResolveServicesScope);
    }
}