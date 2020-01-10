import { isFunction } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { BeforeInit } from '../ComponentLifecycle';
import { IComponentReflect } from '../IComponentReflect';


/**
 * module before init handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const ModuleBeforeInitHandle = async function (ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
    if (!(<IComponentReflect>ctx.targetReflect).component) {
        return;
    }

    if (ctx.decorator) {
        let target = ctx.value as BeforeInit;
        if (target && isFunction(target.onBeforeInit)) {
            await target.onBeforeInit();
        }
    }
    if (next) {
        await next();
    }
};
