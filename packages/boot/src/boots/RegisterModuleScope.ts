import { isBaseType, IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { AnnoationContext } from '../AnnoationContext';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';
import { BootContext } from '../BootContext';


export class RegisterModuleScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        if (!ctx.type) {
            if (ctx.getTemplate() && next) {
                return await next();
            }
            return;
        }
        if (isBaseType(ctx.type)) {
            return;
        }
        // has module register or not.
        if (!ctx.reflects.hasRegister(ctx.type)) {
            await super.execute(ctx);
        }
        if (ctx.getAnnoation() && next) {
            await next();
        }
    }
    setup() {
        this.use(RegisterAnnoationHandle);
    }
}
