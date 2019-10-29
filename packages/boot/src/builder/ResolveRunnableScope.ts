import { BootContext } from '../BootContext';
import { BuildHandles } from '../core';
import { Startup } from '../runnable';
import { RefRunnableHandle } from './RefRunnableHandle';


export class ResolveRunnableScope extends BuildHandles<BootContext> {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let target = ctx.getBootTarget();
        if (!(target instanceof Startup)) {
            super.execute(ctx);
        } else {
            ctx.runnable = target;
        }

        if (ctx.runnable) {
            await next();
        }
    }

    setup() {
        this.use(RefRunnableHandle);
    }
}
