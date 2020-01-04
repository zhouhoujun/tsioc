import { LifeScope, IActionSetup } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveServiceScope } from './ResolveServiceScope';


export class ServiceResolveLifeScope<T> extends LifeScope<ResolveServiceContext<T>> implements IActionSetup {

    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (!ctx.instance && ctx.tokens && ctx.tokens.length) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(ResolveServiceScope);
    }
}
