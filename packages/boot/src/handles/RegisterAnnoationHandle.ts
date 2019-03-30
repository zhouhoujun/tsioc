import { AnnoationHandle, AnnoationContext, Next, ModuleInjectLifeScope } from '../core';
import { ModuleDecoratorRegisterer } from '@tsdi/core';
import { MetadataService } from '@tsdi/ioc';

export class RegisterAnnoationHandle extends AnnoationHandle {
    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        let mdRgr = this.container.get(ModuleDecoratorRegisterer);
        if (!ctx.decorator) {
            ctx.decorator = this.container.get(MetadataService)
                .getClassDecorators(ctx.type).find(c => mdRgr.has(c));
        }
        this.container.get(ModuleInjectLifeScope).execute(ctx);
        await next();
    }
}
