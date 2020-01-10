import { isFunction } from '@tsdi/ioc';
import { BuildContext, ResolveHandle } from '@tsdi/boot';
import { OnInit } from '../ComponentLifecycle';

/**
 * module after init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export class ModuleInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {

        let target = ctx.value as OnInit;
        if (target && isFunction(target.onInit)) {
            await target.onInit();
        }

        if (next) {
            await next();
        }
    }
}
