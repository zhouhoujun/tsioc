import { IActionSetup } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { BuildHandles } from '../core';
import { Startup } from '../runnable/Startup';
import { RefRunnableHandle } from './RefRunnableHandle';


export class ResolveRunnableScope extends BuildHandles<BootContext> implements IActionSetup {
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
