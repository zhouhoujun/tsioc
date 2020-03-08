import { isToken, isArray, lang, PromiseUtil } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';
import { StartupService } from '../services/StartupService';
import { CTX_APP_STARTUPS } from '../context-tokens';

export const ConfigureServiceHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let startups = ctx.getStarupTokens();
    const injector = ctx.injector;
    const prds = injector.getServiceProviders(StartupService);
    if (startups && startups.length) {
        await PromiseUtil.step(startups.map(c => async () => {
            prds.unregister(c);
            let instance = injector.resolve({ token: c, regify: true });
            if (instance instanceof StartupService) {
                await instance.configureService(ctx);
            }
        }));
    }

    let sers = []
    prds.iterator((fac) => {
        sers.push(fac(ctx.providers));
    });
    if (sers && sers.length) {
        startups = startups ?? [];
        ctx.setValue(CTX_APP_STARTUPS, startups);
        await Promise.all(sers.map(async ser => {
            let tks = await ser.configureService(ctx);
            if (isArray(tks)) {
                startups.push(...tks.filter(t => isToken(t)))
            } else if (isToken(tks)) {
                startups.push(tks);
            } else {
                let type = lang.getClass(ser);
                startups.push(lang.getClass(ser));
                ctx.setValue(type, ser);
            }
        }));
    }
    await next();
};
