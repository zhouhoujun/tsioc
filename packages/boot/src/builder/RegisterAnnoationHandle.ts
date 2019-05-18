import { AnnoationHandle, ModuleInjectLifeScope } from '../core';
import { lang } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { ModuleDecoratorService } from '../services';


export class RegisterAnnoationHandle extends AnnoationHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.decorator) {
            ctx.decorator = this.container.get(ModuleDecoratorService).getDecorator(ctx.module);
        }
        if (ctx.annoation && ctx.annoation.baseURL) {
            ctx.baseURL = ctx.annoation.baseURL;
        }
        if (ctx.decorator) {
            this.container
                .getActionRegisterer()
                .get(ModuleInjectLifeScope).execute(ctx);
            await next();
        } else {
            console.log(ctx.module);
            throw new Error(`boot type [${lang.getClassName(ctx.module)}] is not vaild annoation class.`);
        }
    }
}
