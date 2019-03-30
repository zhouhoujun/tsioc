import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class ResolveModuleHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (!ctx.target) {
            ctx.target = ctx.resolve(ctx.type);
        }
        await next();
    }
}
