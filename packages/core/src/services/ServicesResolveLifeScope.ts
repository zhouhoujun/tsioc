import { Singleton, ProviderMap, Autorun, LifeScope } from '@tsdi/ioc';
import { ResolveServicesContext, InitServiceResolveAction, ResolveServicesScope } from '../resolves';


@Singleton
@Autorun('setup')
export class ServicesResolveLifeScope<T> extends LifeScope<ResolveServicesContext<T>> {

    execute(ctx: ResolveServicesContext<T>, next?: () => void): void {
        ctx.services = this.container.resolve(ProviderMap);
        super.execute(ctx, next);
    }

    setup() {
        if (!this.container.has(InitServiceResolveAction)) {
            this.registerAction(InitServiceResolveAction);
        }
        this.registerAction(ResolveServicesScope, true);

        this.use(InitServiceResolveAction)
            .use(ResolveServicesScope)
    }
}
