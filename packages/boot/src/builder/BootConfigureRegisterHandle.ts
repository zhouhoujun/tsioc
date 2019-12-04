import { LogConfigureToken } from '@tsdi/logs';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureRegister } from '../annotations/ConfigureRegister';

/**
 * boot configure register handle.
 *
 * @export
 * @class BootConfigureRegisterHandle
 * @extends {BootHandle}
 */
export class BootConfigureRegisterHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let config = ctx.configuration;
        let regs = ctx.getContainer().getServices(ConfigureRegister);
        if (regs && regs.length) {
            await Promise.all(regs.map(reg => reg.register(config, ctx)));
            if (config.logConfig && !this.container.has(LogConfigureToken) && !ctx.getContainer().has(LogConfigureToken)) {
                this.container.bindProvider(LogConfigureToken, config.logConfig);
            }
        }
        await next();
    }
}
