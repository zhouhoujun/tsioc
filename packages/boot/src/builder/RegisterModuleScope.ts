import { RegisterModuleRegisterHandle } from './RegisterModuleRegisterHandle';
import { AnnoationContext, BuildHandles, AnnotationServiceToken } from '../core';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';
import { BootContext } from '../BootContext';


export class RegisterModuleScope extends BuildHandles<AnnoationContext> {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        // has build module instance.
        if (!(this.container.has(ctx.module) && ctx.getRaiseContainer().has(ctx.module))) {
            await super.execute(ctx);
        }
        if (!ctx.targetReflect) {
            ctx.targetReflect = ctx.reflects.get(ctx.module);
        }

        if (!ctx.annoation && ctx.targetReflect) {
            ctx.annoation = ctx.targetReflect.getAnnoation ? ctx.targetReflect.getAnnoation() : this.container.get(AnnotationServiceToken).getAnnoation(ctx.module, ctx.targetReflect.decorator);
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
