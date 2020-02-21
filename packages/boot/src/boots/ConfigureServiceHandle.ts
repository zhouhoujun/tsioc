import { isToken, isArray, lang, Token } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';
import { StartupService } from '../services/StartupService';
import { CTX_APP_STARTUPS } from '../context-tokens';

export const ConfigureServiceHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let regs = ctx.injector.getServices(StartupService);
    if (regs && regs.length) {
        let startups: Token[] = [];
        ctx.setValue(CTX_APP_STARTUPS, startups);
        await Promise.all(regs.map(async reg => {
            let tks = await reg.configureService(ctx);
            if (isArray(tks)) {
                startups.push(...tks.filter(t => isToken(t)))
            } else if (isToken(tks)) {
                startups.push(tks);
            } else {
                let type = lang.getClass(reg);
                startups.push(lang.getClass(reg));
                ctx.setValue(type, reg);
            }
        }));
    }
    await next();
};
