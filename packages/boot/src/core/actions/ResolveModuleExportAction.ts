import { IocResolveAction, ResovleActionContext, Singleton } from '@ts-ioc/ioc';
import { DIModuleExports } from '../services';
import { IModuleResolver } from '../modules';

/**
 * reolve module export.
 *
 * @export
 * @class ResolveModuleExportAction
 * @extends {IocResolveAction}
 */
@Singleton
export class ResolveModuleExportAction extends IocResolveAction {

    execute(ctx: ResovleActionContext, next: () => void): void {
        let curr = ctx.getRaiseContainer();
        ctx.instance = curr.resolve(DIModuleExports).resolve(ctx.token, ...ctx.providers);
        // curr.resolve(DIModuleExports).getResolvers()
        //     .some(r => {
        //         this.depIterator(ctx, r);
        //         return !!ctx.instance;
        //     });

        if (!ctx.instance) {
            // curr.bindActionContext(ctx);
            next();
        }
    }

    // depIterator(ctx: ResovleActionContext, resolver: IModuleResolver) {
    //     ctx.setRaiseContainer(resolver.getContainer())
    //     ctx.setProviderContainer(resolver.getProviders());
    //     super.execute(ctx);
    //     if (resolver.has(DIModuleExports)) {
    //         resolver.resolve(DIModuleExports).getResolvers()
    //             .forEach(r => {
    //                 this.depIterator(ctx, r);
    //             })
    //     }
    // }
}
