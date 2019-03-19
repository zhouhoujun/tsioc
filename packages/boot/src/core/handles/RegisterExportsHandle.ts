import { Next } from './Handle';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { ContainerPoolToken } from '../ContainerPool';
import { DIModuleExports } from '../services';
import { Singleton } from '@ts-ioc/ioc';
import { ModuleScope } from '../modules';

@Singleton
export class RegisterExportsHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        if (ctx.moduleScope !== ModuleScope.root && ctx.moduleResolver) {
            let pool = ctx.resolve(ContainerPoolToken);
            let parent = pool.getParent(ctx.moduleContainer);
            if (parent) {
                let diexports = parent.resolve(DIModuleExports);
                diexports.use(ctx.moduleResolver);
            }
        }
        await next();
    }
}
