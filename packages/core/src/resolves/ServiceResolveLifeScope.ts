import { LifeScope } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
// import { ServiceDecoratorRegisterer } from './ServiceDecoratorRegisterer';
import { InitServiceResolveAction } from './InitServiceResolveAction';
import { ResolveServiceScope } from './ResolveServiceScope';
import { ResolveDefaultServiceAction } from './ResolveServiceTokenAction';


export class ServiceResolveLifeScope<T> extends LifeScope<ResolveServiceContext<T>> {

    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        // this.container.register(ServiceDecoratorRegisterer);
        this.use(InitServiceResolveAction)
            .use(ResolveServiceScope, true)
            .use(ResolveDefaultServiceAction);
    }
}
