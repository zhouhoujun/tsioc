import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { Next } from './Handle';
import { Singleton, hasOwnClassMetadata } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../ContainerPool';
import { ModuleScope } from '../modules';

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
        if (!ctx.moduleContainer) {
            let pools = ctx.resolve(ContainerPoolToken);
            let mdScope = ctx.annoation.regScope || ModuleScope.child;
            ctx.moduleScope = mdScope;
            switch (mdScope) {
                case ModuleScope.root:
                case ModuleScope.all:
                    ctx.moduleContainer = pools.getRoot();
                    break;
                case ModuleScope.booModule:
                    ctx.moduleContainer = ctx.getRaiseContainer();
                    break;
                case ModuleScope.child:
                    ctx.moduleContainer = pools.create(ctx.getRaiseContainer());
                    break;
            }
            ctx.setContext(() => ctx.moduleContainer)
        }

        if (ctx.moduleContainer) {
            await next();
        }
    }
}
