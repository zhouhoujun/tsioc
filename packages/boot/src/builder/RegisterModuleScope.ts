import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { AnnoationContext, CompositeHandle } from '../core';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';
import { BootContext } from '../BootContext';
import { ModuleDecoratorService } from '../services';


export class RegisterModuleScope extends CompositeHandle<AnnoationContext> {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        // has build module instance.
        if (!(this.container.has(ctx.module) && ctx.getRaiseContainer().has(ctx.module))) {
            await super.execute(ctx);
        } else {
            if (!ctx.decorator) {
                ctx.decorator = this.container.get(ModuleDecoratorService).getDecorator(ctx.module);
            }
            if (ctx.decorator) {
                if (!ctx.annoation) {
                    ctx.annoation = this.container.get(ModuleDecoratorService).getAnnoation(ctx.module, ctx.decorator);
                }
            }
        }

        if (ctx.annoation && ctx.annoation.baseURL) {
            ctx.baseURL = ctx.annoation.baseURL;
        }

        if (next) {
            await next();
        }

    }
    setup() {
        this.use(RegisterAnnoationHandle)
            .use(RegisterModuleRegisterHandle);
    }
}
