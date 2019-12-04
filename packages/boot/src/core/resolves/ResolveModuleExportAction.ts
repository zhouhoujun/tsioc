import { IocResolveAction, ResolveActionContext } from '@tsdi/ioc';
import { DIModuleExports } from '../injectors/DIModuleExports';

/**
 * reolve module export.
 *
 * @export
 * @class ResolveModuleExportAction
 * @extends {IocResolveAction}
 */
export class ResolveModuleExportAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        ctx.instance = this.container.getInstance(DIModuleExports).resolve(ctx.token, ...ctx.providers);
        if (!ctx.instance) {
            next();
        }
    }
}
