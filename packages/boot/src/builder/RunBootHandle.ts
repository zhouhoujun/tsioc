import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';

export class RunBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.getOptions().autorun !== false) {
            await ctx.runnable.startup();
        }

        await next();
    }
}
