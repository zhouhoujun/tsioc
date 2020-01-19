import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { BootContext } from '../BootContext';
import { ResolveBootHandle } from './ResolveBootHandle';
import { ResolveTypeHandle } from './ResolveTypeHandle';
import { CTX_MODULE_BOOT, CTX_MODULE_INST } from '../context-tokens';


export class ModuleBuildScope extends BuildHandles<BootContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (!ctx.hasValue(CTX_MODULE_INST) && !ctx.hasValue(CTX_MODULE_BOOT)) {
            await super.execute(ctx);
        }
        if (!ctx.hasValue(CTX_MODULE_BOOT) && ctx.hasValue(CTX_MODULE_INST)) {
            ctx.setValue(CTX_MODULE_BOOT, ctx.target)
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
