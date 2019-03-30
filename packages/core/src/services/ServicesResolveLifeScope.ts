import { Singleton, ProviderMap, Autorun, LifeScope } from '@tsdi/ioc';
import { ResolveServicesContext, InitServiceResolveAction, ResolveServicesScopeAction } from '../resolves';


@Singleton
@Autorun('setup')
export class ServicesResolveLifeScope extends LifeScope<ResolveServicesContext> {

    execute(ctx: ResolveServicesContext, next?: () => void): void {
        ctx.services = this.container.resolve(ProviderMap);
        super.execute(ctx, next);
    }

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveServicesScopeAction)
    }
}
