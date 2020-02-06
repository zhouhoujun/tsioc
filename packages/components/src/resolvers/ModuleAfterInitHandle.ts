import { isFunction } from '@tsdi/ioc';
import { AfterInit } from '../ComponentLifecycle';
import { IComponentContext } from '../ComponentContext';

/**
 * module after init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as AfterInit;
    if (target && isFunction(target.onAfterInit)) {
        await target.onAfterInit();
    }
    if (next) {
        await next();
    }
};
