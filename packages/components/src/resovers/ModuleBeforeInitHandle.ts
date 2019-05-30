import { BuildContext, ResolveHandle } from '@tsdi/boot';
import { BeforeInit } from '../ComponentLifecycle';
import { isFunction } from '@tsdi/ioc';


export class ModuleBeforeInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (!this.isComponent(ctx)) {
            return;
        }
        if (ctx.decorator) {
            let target = ctx.target as BeforeInit;
            if (target && isFunction(target.onBeforeInit)) {
                await target.onBeforeInit();
            }
        }
        if (next) {
            await next();
        }
    }
}
