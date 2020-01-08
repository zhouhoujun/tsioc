import { BootContext } from '../BootContext';

export const RunBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.getOptions().autorun !== false) {
        await ctx.runnable.startup();
    }

    await next();
};
