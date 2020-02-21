import { BootContext } from '../BootContext';

export const StartupBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.getStartup();
    await startup.configureService(ctx);
    await startup.startup();
    await next();
};
