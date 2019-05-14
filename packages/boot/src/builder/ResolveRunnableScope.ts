import { BootContext } from '../BootContext';
import { CompositeHandle } from '../core';
import { Runnable } from '../runnable';
import { RefRunnableHandle } from './RefRunnableHandle';
import { RefDecoratorRunnableHandle } from './RefDecoratorRunnableHandle';


export class ResolveRunnableScope extends CompositeHandle<BootContext> {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
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
