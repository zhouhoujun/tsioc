import { Singleton, Autorun, LifeScope } from '@tsdi/ioc';
import {
    ResolveServiceContext, InitServiceResolveAction, ResolveServiceScope,
    ResolveDefaultServiceAction
} from '../resolves';


@Singleton
@Autorun('setup')
export class ServiceResolveLifeScope<T> extends LifeScope<ResolveServiceContext<T>> {

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveServiceScope)
            .use(ResolveDefaultServiceAction);
    }
}
