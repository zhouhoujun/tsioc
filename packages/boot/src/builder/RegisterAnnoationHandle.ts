import { lang } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { AnnoationHandle } from './AnnoationHandle';
import { CTX_MODULE_ANNOATION } from '../context-tokens';



export class RegisterAnnoationHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        ctx.injector.registerType(ctx.module);
        let annoation = ctx.targetReflect.getAnnoation ? ctx.targetReflect.getAnnoation() : null;
        if (annoation) {
            ctx.set(CTX_MODULE_ANNOATION, annoation);
            next();
        } else {
            console.log(ctx.module);
            throw new Error(`boot type [${lang.getClassName(ctx.module)}] is not vaild annoation class.`);
        }
    }
}
