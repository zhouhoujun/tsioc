import { isFunction } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { OnInit } from '../ComponentLifecycle';

/**
 * module init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleInitHandle = async function (ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as OnInit;
    if (target && isFunction(target.onInit)) {
        await target.onInit();
    }
    if (next) {
        await next();
    }
};
