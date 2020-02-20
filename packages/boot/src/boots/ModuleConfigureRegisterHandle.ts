import { BootContext } from '../BootContext';
import { ConfigureRegister } from '../annotations/ConfigureRegister';
import { ConfigureManager } from '../annotations/ConfigureManager';


export const ModuleConfigureRegisterHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let regs = ctx.injector.getServices({ token: ConfigureRegister, target: ctx.type });
    if (regs && regs.length) {
        let config = ctx.getConfiguration();
        if (!config) {
            let mgr = ctx.injector.resolve(ConfigureManager);
            config = await mgr.getConfig();
        }
        await Promise.all(regs.map(reg => reg.register(config, ctx)));
    }
    await next();
};
