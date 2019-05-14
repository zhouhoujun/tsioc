import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { RunnableInit } from '../runnable';
import { isFunction } from '@tsdi/ioc';

export class RunBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let runnable = ctx.runnable as any as RunnableInit;
        if (isFunction(runnable.onInit)) {
            await runnable.onInit();
        }

        if (ctx.autorun !== false) {
            await ctx.runnable.run(ctx.data);
        }

        await next();
    }
}
