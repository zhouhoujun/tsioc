import { BootContext } from '../BootContext';

export const StartupBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.getStartup();
    await startup.configureService(ctx);
    if (ctx.getOptions().autorun !== false) {
        await startup.startup();
    }
    await next();
};
