import { isFunction } from '@tsdi/ioc';
import { BeforeInit } from '../ComponentLifecycle';
import { IComponentContext } from '../ComponentContext';


/**
 * module before init handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const ModuleBeforeInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as BeforeInit;
    if (target && isFunction(target.onBeforeInit)) {
        await target.onBeforeInit();
    }

    if (next) {
        await next();
    }
};
