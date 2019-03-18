import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';
import { Singleton, hasOwnClassMetadata } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../ContainerPool';
import { RootModule } from '../decorators';

/**
 * set module type register container.
 *
 * @export
 * @class ModuleContainerHandle
 * @extends {AnnoationHandle}
 */
@Singleton
export class ModuleContainerHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        let pools = ctx.resolve(ContainerPoolToken);
        let isRootModule = hasOwnClassMetadata(RootModule, ctx.type) || ctx.annoation.asRoot;
        ctx.isRoot = isRootModule;
        ctx.moduleContainer = isRootModule === true ? pools.getRoot() : pools.create(ctx.getRaiseContainer());
        if (ctx.moduleContainer) {
            await next();
        }
    }
}
