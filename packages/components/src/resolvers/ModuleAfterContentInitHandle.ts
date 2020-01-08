import { isFunction } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { AfterContentInit } from '../ComponentLifecycle';


/**
 * module ater content init handle.
 *
 * @export
 * @class ModuleAfterContentInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterContentInitHandle = async function (ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.target as AfterContentInit;
    if (target && isFunction(target.onAfterContentInit)) {
        await target.onAfterContentInit();
    }

    if (next) {
        await next();
    }
};
