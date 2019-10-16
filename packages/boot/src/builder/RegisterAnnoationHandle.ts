import { AnnoationHandle, ModuleInjectLifeScope, AnnotationServiceToken } from '../core';
import { lang, ActionRegisterer } from '@tsdi/ioc';
import { BootContext } from '../BootContext';


export class RegisterAnnoationHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let dec = this.container.get(AnnotationServiceToken).getDecorator(ctx.module);
        if (dec) {
            this.container.getInstance(ActionRegisterer)
                .get(ModuleInjectLifeScope).register(ctx.module, dec);

            await next();
        } else {
            console.log(ctx.module);
            throw new Error(`boot type [${lang.getClassName(ctx.module)}] is not vaild annoation class.`);
        }
    }
}
