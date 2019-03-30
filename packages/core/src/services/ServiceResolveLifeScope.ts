import { Singleton, Autorun, LifeScope } from '@tsdi/ioc';
import {
    ResolveServiceContext, InitServiceResolveAction, ResolveServiceScopeAction,
    ResolveDefaultServiceAction
} from '../resolves';


@Singleton
@Autorun('setup')
export class ServiceResolveLifeScope extends LifeScope<ResolveServiceContext> {

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveServiceScopeAction)
            .use(ResolveDefaultServiceAction);
    }
}
