import { isFunction } from '@tsdi/ioc';
import { IBuildContext } from '@tsdi/boot';
import { AfterInit } from '../ComponentLifecycle';

/**
 * module after init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterInitHandle = async function (ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as AfterInit;
    if (target && isFunction(target.onAfterInit)) {
        await target.onAfterInit();
    }
    if (next) {
        await next();
    }
};
