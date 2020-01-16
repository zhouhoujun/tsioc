import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { BootContext } from '../BootContext';
import { ResolveBootHandle } from './ResolveBootHandle';
import { ResolveTypeHandle } from './ResolveTypeHandle';
import { CTX_MODULE_BOOT, CTX_MODULE_INST } from '../context-tokens';


export class ModuleBuildScope extends BuildHandles<BootContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (!ctx.has(CTX_MODULE_INST) && !ctx.has(CTX_MODULE_BOOT)) {
            await super.execute(ctx);
        }
        if (!ctx.has(CTX_MODULE_BOOT) && ctx.has(CTX_MODULE_INST)) {
            ctx.set(CTX_MODULE_BOOT, ctx.target)
        }
        if (next) {
            await next();
        }
    }

    setup() {
        this.use(ResolveTypeHandle)
            .use(ResolveBootHandle);
    }
}
