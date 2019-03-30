import { Singleton } from '@tsdi/ioc';
import { AnnoationHandle, AnnoationContext, Next, ContainerPoolToken, DIModuleExports } from '../core';

@Singleton
export class RegisterExportsHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.moduleResolver) {
            let pool = this.resolve(ContainerPoolToken);
            let parent = pool.getParent(ctx.getRaiseContainer());
            if (parent) {
                let diexports = parent.resolve(DIModuleExports);
                diexports.use(ctx.moduleResolver);
            }
        }
        await next();
    }
}
