import { LifeScope, InjectorFactory, IActionSetup } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { InitServiceResolveAction } from './InitServiceResolveAction';
import { ResolveServicesScope } from './ResolveServicesScope';


export class ServicesResolveLifeScope<T> extends LifeScope<ResolveServicesContext<T>> implements IActionSetup {

    execute(ctx: ResolveServicesContext<T>, next?: () => void): void {
        ctx.services = ctx.get(InjectorFactory);
        super.execute(ctx, next);
    }

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveServicesScope)
    }
}
