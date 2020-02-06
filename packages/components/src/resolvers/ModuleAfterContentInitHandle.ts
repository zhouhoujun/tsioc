import { isFunction } from '@tsdi/ioc';
import { AfterContentInit } from '../ComponentLifecycle';
import { IComponentContext } from '../ComponentContext';


/**
 * module ater content init handle.
 *
 * @export
 * @class ModuleAfterContentInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterContentInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as AfterContentInit;
    if (target && isFunction(target.onAfterContentInit)) {
        await target.onAfterContentInit();
    }

    if (next) {
        await next();
    }
};
