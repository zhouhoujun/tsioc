import { lang, InjectToken } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { AnnoationHandle } from '../builder/AnnoationHandle';
import { CTX_MODULE_ANNOATION } from '../context-tokens';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';



export class RegisterAnnoationHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        ctx.injector.registerType(ctx.type);
        let annoation = ctx.targetReflect.getAnnoation ? ctx.targetReflect.getAnnoation() : null;
        ctx.set(InjectToken, ctx.targetReflect.getInjector());
        if (annoation) {
            ctx.set(CTX_MODULE_ANNOATION, annoation);
            if (annoation.baseURL) {
                ctx.injector.registerValue(ProcessRunRootToken, ctx.annoation.baseURL);
            }
            next();
        } else {
            throw new Error(`boot type [${lang.getClassName(ctx.type)}] is not vaild annoation class.`);
        }
    }
}
