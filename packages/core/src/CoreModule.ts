import { Inject, Injector, IocExt, ROOT_INJECTOR, ServicesProvider } from '@tsdi/ioc';
import { Services } from './services/providers';
import { ResolveServicesScope } from './resolves/actions';

@IocExt()
export class CoreModule {

    /**
     * register aop in root injector.
     */
    setup(@Inject(ROOT_INJECTOR) injector: Injector) {
        injector.setValue(ServicesProvider, new Services(injector));
        // register action
        injector.action().regAction(ResolveServicesScope);
    }
}