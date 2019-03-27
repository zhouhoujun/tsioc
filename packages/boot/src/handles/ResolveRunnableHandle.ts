
import { BootContext } from '../BootContext';
import { Next, CompositeHandle } from '../core';
import { Singleton, Autorun } from '@ts-ioc/ioc';
import { Runnable } from '../runnable';
import { RefRunnableHandle } from './RefRunnableHandle';
import { RefDecoratorRunnableHandle } from './RefDecoratorRunnableHandle';

@Singleton
@Autorun('setup')
export class ResolveRunnableHandle extends CompositeHandle<BootContext> {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.bootstrap instanceof Runnable) {
            ctx.runnable = ctx.bootstrap;
        } else if (ctx.target instanceof Runnable) {
            ctx.runnable = ctx.target;
        } else {
            super.execute(ctx);
        }

        if (ctx.runnable) {
            await next();
        }
    }

    setup() {
        this.use(RefRunnableHandle)
            .use(RefDecoratorRunnableHandle);
    }
}
