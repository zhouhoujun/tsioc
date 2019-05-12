import { AnnoationHandle, ModuleInjectLifeScope } from '../core';
import { ModuleDecoratorRegisterer } from '@tsdi/core';
import { MetadataService, DesignDecoratorRegisterer, DecoratorScopes, RuntimeDecoratorRegisterer, lang } from '@tsdi/ioc';
import { BootContext } from '../BootContext';


export class RegisterAnnoationHandle extends AnnoationHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.decorator) {
            let decorators = this.container.get(MetadataService)
                .getClassDecorators(ctx.module);
            let mdRgr = this.container.get(ModuleDecoratorRegisterer);
            ctx.decorator = decorators.find(c => mdRgr.has(c));
            if (!ctx.decorator) {
                let designReg = this.container.get(DesignDecoratorRegisterer).getRegisterer(DecoratorScopes.Class)
                ctx.decorator = decorators.find(c => designReg.has(c));
            }
            if (!ctx.decorator) {
                let runtimeReg = this.container.get(RuntimeDecoratorRegisterer).getRegisterer(DecoratorScopes.Class)
                ctx.decorator = decorators.find(c => runtimeReg.has(c));
            }
        }
        if (ctx.decorator) {
            this.container.actions.get(ModuleInjectLifeScope).execute(ctx);
            await next();
        } else {
            console.log(ctx.module);
            throw new Error(`boot type [${lang.getClassName(ctx.module)}] is not vaild annoation class.`);
        }
    }
}
