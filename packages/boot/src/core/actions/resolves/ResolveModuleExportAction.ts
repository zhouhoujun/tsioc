import { Singleton } from '@ts-ioc/ioc';
import { DIModuleExports } from '../../services';
import { IocResolveAction, ResovleActionContext } from '@ts-ioc/core';

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
