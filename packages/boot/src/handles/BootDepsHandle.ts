import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class BootDepsHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.deps && ctx.deps.length) {
            let container = ctx.getRaiseContainer();
            await container.loadModule(...ctx.deps);
        }
        await next();
    }
}
