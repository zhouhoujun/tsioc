import { Singleton, IocResolveAction, ResolveActionContext } from '@tsdi/ioc';
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

    execute(ctx: ResolveActionContext<any>, next: () => void): void {
        ctx.instance = this.container.get(DIModuleExports).resolve(ctx.token, ...ctx.providers);
        if (!ctx.instance) {
            next();
        }
    }

}
