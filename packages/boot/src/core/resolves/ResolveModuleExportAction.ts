import { Singleton } from '@tsdi/ioc';
import { DIModuleExports } from '../services';
import { IocResolveAction, ResovleActionContext } from '@tsdi/core';

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
        ctx.instance = this.container.resolve(DIModuleExports).resolve(ctx.token, ...ctx.providers);
        if (!ctx.instance) {
            next();
        }
    }

}
