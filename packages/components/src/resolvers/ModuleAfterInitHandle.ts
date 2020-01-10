import { isFunction } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { AfterInit } from '../ComponentLifecycle';

/**
 * module after init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterInitHandle = async function (ctx: BuildContext, next?: () => Promise<void>): Promise<void> {

    let target = ctx.value as AfterInit;
    if (target && isFunction(target.onAfterInit)) {
        await target.onAfterInit();
    }

    if (next) {
        await next();
    }
};
