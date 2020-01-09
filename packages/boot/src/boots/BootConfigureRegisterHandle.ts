import { LogConfigureToken } from '@tsdi/logs';
import { BootContext } from '../BootContext';
import { ConfigureRegister } from '../annotations/ConfigureRegister';

/**
 * boot configure register handle.
 *
 * @export
 */
export const BootConfigureRegisterHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let config = ctx.configuration;
    let regs = ctx.injector.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));
        if (config.logConfig && !ctx.injector.has(LogConfigureToken) && !ctx.getContainer().has(LogConfigureToken)) {
            ctx.injector.registerValue(LogConfigureToken, config.logConfig);
        }
    }
    await next();
};

