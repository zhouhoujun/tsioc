import { lang, INJECTOR } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { CTX_MODULE_ANNOATION } from '../context-tokens';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';



export const RegisterAnnoationHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let targetReflect = ctx.getTargetReflect();
    if (!targetReflect || !targetReflect.getInjector) {
        ctx.injector.registerType(ctx.type);
        targetReflect = ctx.getTargetReflect();
    }
    let annoation = targetReflect?.getAnnoation ? targetReflect.getAnnoation() : null;
    ctx.setValue(INJECTOR, targetReflect.getInjector());
    if (annoation) {
        ctx.setValue(CTX_MODULE_ANNOATION, annoation);
        if (annoation.baseURL) {
            ctx.injector.setValue(ProcessRunRootToken, annoation.baseURL);
        }
        next();
    } else {
        throw new Error(`boot type [${lang.getClassName(ctx.type)}] is not vaild annoation class.`);
    }
};
