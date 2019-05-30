
import { BuildContext, ResolveHandle } from '@tsdi/boot';
import { AfterInit } from '../ComponentLifecycle';
import { isFunction } from '@tsdi/ioc';

export class ModuleAfterInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {

        let target = ctx.target as AfterInit;
        if (target && isFunction(target.onAfterInit)) {
            await target.onAfterInit();
        }

        if (next) {
            await next();
        }
    }
}
