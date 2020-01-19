import { lang, INJECTOR } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { CTX_MODULE_ANNOATION } from '../context-tokens';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';



export const RegisterAnnoationHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.targetReflect || !ctx.targetReflect.getInjector) {
        ctx.injector.registerType(ctx.type);
    }
    let annoation = ctx.targetReflect.getAnnoation ? ctx.targetReflect.getAnnoation() : null;
    ctx.setValue(INJECTOR, ctx.targetReflect.getInjector());
    if (annoation) {
        ctx.setValue(CTX_MODULE_ANNOATION, annoation);
        if (annoation.baseURL) {
            ctx.injector.setValue(ProcessRunRootToken, ctx.annoation.baseURL);
        }
        next();
    } else {
        throw new Error(`boot type [${lang.getClassName(ctx.type)}] is not vaild annoation class.`);
    }
};
