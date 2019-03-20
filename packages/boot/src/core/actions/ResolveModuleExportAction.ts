import { IocResolveAction, ResovleActionContext, Singleton } from '@ts-ioc/ioc';
import { DIModuleExports } from '../services';

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
        //         ctx.instance = r.resolve()
        //         return !!ctx.instance;
        //     });

        if (!ctx.instance) {
            next();
        }
    }

    // depIterator(ctx: ResolveServicesContext, resolver: IResolverContainer) {
    //     resolver.bindActionContext(ctx);
    //     super.execute(ctx);
    //     if (resolver.has(DIModuleExports)) {
    //         resolver.resolve(DIModuleExports).getResolvers()
    //             .forEach(r => {
    //                 this.depIterator(ctx, r);
    //             })
    //     }
    // }
}
