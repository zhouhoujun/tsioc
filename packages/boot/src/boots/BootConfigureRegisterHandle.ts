import { LogConfigureToken } from '@tsdi/logs';
import { IBootContext } from '../BootContext';
import { ConfigureRegister } from '../annotations/ConfigureRegister';

/**
 * boot configure register handle.
 *
 * @export
 */
export const BootConfigureRegisterHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let config = ctx.getConfiguration();
    let regs = ctx.injector.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));
        if (config.logConfig && !ctx.injector.has(LogConfigureToken) && !ctx.getContainer().has(LogConfigureToken)) {
            ctx.injector.setValue(LogConfigureToken, config.logConfig);
        }
    }
    await next();
};

