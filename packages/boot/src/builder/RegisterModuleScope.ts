import { isBaseType, IActionSetup } from '@tsdi/ioc';
import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { AnnoationContext, BuildHandles } from '../core';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';
import { BootContext } from '../BootContext';


export class RegisterModuleScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        if (!ctx.module) {
            if (ctx.getOptions().template && next) {
                return await next();
            }
            return;
        }
        if (isBaseType(ctx.module)) {
            return;
        }
        // has build module instance.
        if (!(ctx.injector.has(ctx.module) && ctx.getContainer().has(ctx.module))) {
            await super.execute(ctx);
        }

        if (ctx.annoation && next) {
            await next();
        }
    }
    setup() {
        this.use(RegisterAnnoationHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
