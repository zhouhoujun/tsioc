import { Singleton, ProviderMap, Autorun, LifeScope } from '@tsdi/ioc';
import { ResolveServicesContext, InitServiceResolveAction, ResolveServicesScopeAction } from '../resolves';


@Singleton
@Autorun('setup')
export class ServicesResolveLifeScope<T> extends LifeScope<ResolveServicesContext<T>> {

    execute(ctx: ResolveServicesContext<T>, next?: () => void): void {
        ctx.services = this.container.resolve(ProviderMap);
        super.execute(ctx, next);
    }

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveServicesScopeAction)
    }
}
