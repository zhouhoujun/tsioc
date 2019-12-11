import { Injector, LifeScope, InjectorToken } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { InitServiceResolveAction } from './InitServiceResolveAction';
import { ResolveServicesScope } from './ResolveServicesScope';


export class ServicesResolveLifeScope<T> extends LifeScope<ResolveServicesContext<T>> {

    execute(ctx: ResolveServicesContext<T>, next?: () => void): void {
        ctx.services = ctx.getContainer().get(InjectorToken);
        super.execute(ctx, next);
    }

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveServicesScope)
    }
}
