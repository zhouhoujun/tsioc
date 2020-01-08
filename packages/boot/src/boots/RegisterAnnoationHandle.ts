import { lang, INJECTOR } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { CTX_MODULE_ANNOATION } from '../context-tokens';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';



export const RegisterAnnoationHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.targetReflect || !ctx.targetReflect.getInjector) {
        ctx.injector.registerType(ctx.type);
    }
    let annoation = ctx.targetReflect.getAnnoation ? ctx.targetReflect.getAnnoation() : null;
    ctx.set(INJECTOR, ctx.targetReflect.getInjector());
    if (annoation) {
        ctx.set(CTX_MODULE_ANNOATION, annoation);
        if (annoation.baseURL) {
            ctx.injector.registerValue(ProcessRunRootToken, ctx.annoation.baseURL);
        }
        next();
    } else {
        throw new Error(`boot type [${lang.getClassName(ctx.type)}] is not vaild annoation class.`);
    }
};
