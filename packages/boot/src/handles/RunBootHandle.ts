import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class RunBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {

        await ctx.runnable.onInit();
        await ctx.runnable.run(ctx.data);

        await next();
    }
}
