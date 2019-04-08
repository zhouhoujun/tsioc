import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class RunBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        await ctx.runnable.onInit();
        await ctx.runnable.run(ctx.result);

        await next();
    }
}
