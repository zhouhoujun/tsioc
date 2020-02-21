import { IActionSetup } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { BuildHandles } from '../builder/BuildHandles';
import { Startup } from '../runnable/Startup';
import { RefRunnableHandle } from './RefRunnableHandle';
import { CTX_MODULE_STARTUP } from '../context-tokens';


export class ResolveRunnableScope extends BuildHandles<BootContext> implements IActionSetup {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let boot = ctx.boot;
        if (!(boot instanceof Startup)) {
            super.execute(ctx);
        } else if (boot) {
            ctx.setValue(CTX_MODULE_STARTUP, boot);
        }

        if (ctx.getStartup()) {
            await next();
        }
    }

    setup() {
        this.use(RefRunnableHandle);
    }
}
