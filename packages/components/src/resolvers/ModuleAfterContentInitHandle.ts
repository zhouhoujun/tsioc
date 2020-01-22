import { isFunction } from '@tsdi/ioc';
import { IBuildContext } from '@tsdi/boot';
import { AfterContentInit } from '../ComponentLifecycle';


/**
 * module ater content init handle.
 *
 * @export
 * @class ModuleAfterContentInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterContentInitHandle = async function (ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as AfterContentInit;
    if (target && isFunction(target.onAfterContentInit)) {
        await target.onAfterContentInit();
    }

    if (next) {
        await next();
    }
};
