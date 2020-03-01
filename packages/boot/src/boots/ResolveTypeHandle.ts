import { BootContext } from '../BootContext';
import { BuilderServiceToken } from '../services/IBuilderService';
import { CTX_MODULE_INST } from '../context-tokens';


export const ResolveTypeHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.type && !ctx.hasValue(CTX_MODULE_INST)) {
        let injector =  ctx.injector;
        let target = await injector.getInstance(BuilderServiceToken).resolve({
            type: ctx.type,
            parent: ctx.getParent(),
            providers: ctx.providers
        });
        target && ctx.setValue(CTX_MODULE_INST, target);
    }
    await next();
};
