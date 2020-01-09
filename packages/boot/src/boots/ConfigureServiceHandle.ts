import { isToken, isArray } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { StartupService } from '../services/StartupService';

export const ConfigureServiceHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let regs = ctx.injector.getServices(StartupService);
    if (regs && regs.length) {
        let sts = ctx.starupServices;
        await Promise.all(regs.map(async reg => {
            let tks = await reg.configureService(ctx);
            if (isArray(tks)) {
                sts.startups.push(...tks.filter(t => isToken(t)))
            } else if (isToken(tks)) {
                sts.startups.push(tks);
            }
        }));
    }
    await next();
};
