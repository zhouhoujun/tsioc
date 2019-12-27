import { LifeScope, INJECTOR, IActionSetup } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { InitServicesResolveAction } from './InitServicesResolveAction';
import { ResolveServicesScope } from './ResolveServicesScope';


export class ServicesResolveLifeScope<T> extends LifeScope<ResolveServicesContext<T>> implements IActionSetup {

    execute(ctx: ResolveServicesContext<T>, next?: () => void): void {
        ctx.services = ctx.get(INJECTOR);
        super.execute(ctx, next);
    }

    setup() {
        this.use(InitServicesResolveAction)
            .use(ResolveServicesScope)
    }
}
