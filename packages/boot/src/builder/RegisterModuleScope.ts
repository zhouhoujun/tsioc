import { isBaseType, IActionSetup } from '@tsdi/ioc';
import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { BuildHandles } from './BuildHandles';
import { AnnoationContext } from '../AnnoationContext';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';
import { BootContext } from '../BootContext';


export class RegisterModuleScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        if (!ctx.type) {
            if (ctx.getOptions().template && next) {
                return await next();
            }
            return;
        }
        if (isBaseType(ctx.type)) {
            return;
        }
        // has build module instance.
        if (!(ctx.injector.has(ctx.type) && ctx.getContainer().has(ctx.type))) {
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
