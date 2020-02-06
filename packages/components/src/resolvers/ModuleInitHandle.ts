import { isFunction } from '@tsdi/ioc';
import { OnInit } from '../ComponentLifecycle';
import { IComponentContext } from '../ComponentContext';

/**
 * module init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as OnInit;
    if (target && isFunction(target.onInit)) {
        await target.onInit();
    }
    if (next) {
        await next();
    }
};
