import { LifeScope, PROVIDERS, IActionSetup } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { ResolveServicesScope } from './ResolveServicesScope';


export class ServicesResolveLifeScope<T> extends LifeScope<ResolveServicesContext<T>> implements IActionSetup {

    execute(ctx: ResolveServicesContext<T>, next?: () => void): void {
        if (ctx.tokens && ctx.tokens.length) {
            ctx.services = ctx.get(PROVIDERS);
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(ResolveServicesScope)
    }
}
