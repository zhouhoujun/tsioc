import { IocResolveAction, ResovleActionContext, Singleton } from '@ts-ioc/ioc';
import { DIModuleExports } from '../../services';

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
        if (!ctx.instance) {
            next();
        }
    }

}
