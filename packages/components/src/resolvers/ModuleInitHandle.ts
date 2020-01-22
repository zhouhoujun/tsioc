import { isFunction } from '@tsdi/ioc';
import { IBuildContext } from '@tsdi/boot';
import { OnInit } from '../ComponentLifecycle';

/**
 * module init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleInitHandle = async function (ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as OnInit;
    if (target && isFunction(target.onInit)) {
        await target.onInit();
    }
    if (next) {
        await next();
    }
};
