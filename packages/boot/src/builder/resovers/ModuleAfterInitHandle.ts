
import { BuildContext } from './BuildContext';
import { ResolveHandle } from './ResolveHandle';
import { AfterInit, ComponentRegisterAction } from '../../core';
import { isFunction } from '@tsdi/ioc';
import { ModuleDecoratorRegisterer } from '@tsdi/core';


export class ModuleAfterInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.decorator && this.container.get(ModuleDecoratorRegisterer).has(ctx.decorator, ComponentRegisterAction)) {
            let target = ctx.target as AfterInit;
            if (target && isFunction(target.onAfterInit)) {
                await target.onAfterInit();
            }
        }
        if (next) {
            await next();
        }
    }
}
