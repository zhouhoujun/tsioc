
import { BuildContext } from './BuildContext';
import { ResolveHandle } from './ResolveHandle';
import { BeforeInit, ComponentRegisterAction } from '../../core';
import { isFunction, DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';


export class ModuleBeforeInitHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (!this.container.get(DesignDecoratorRegisterer).has(ctx.decorator, DecoratorScopes.Class, ComponentRegisterAction)) {
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
