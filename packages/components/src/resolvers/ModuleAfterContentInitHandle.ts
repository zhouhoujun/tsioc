import { isFunction } from '@tsdi/ioc';
import { BuildContext, ResolveHandle } from '@tsdi/boot';
import { AfterContentInit } from '../ComponentLifecycle';


/**
 * module ater content init handle.
 *
 * @export
 * @class ModuleAfterContentInitHandle
 * @extends {ResolveHandle}
 */
export class ModuleAfterContentInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {

        let target = ctx.target as AfterContentInit;
        if (target && isFunction(target.onAfterContentInit)) {
            await target.onAfterContentInit();
        }

        if (next) {
            await next();
        }
    }
}
