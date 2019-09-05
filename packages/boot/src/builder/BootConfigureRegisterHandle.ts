import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureRegister, ConfigureManager } from '../annotations';
import { LogConfigureToken } from '@tsdi/logs';

/**
 * boot configure register handle.
 *
 * @export
 * @class BootConfigureRegisterHandle
 * @extends {BootHandle}
 */
export class BootConfigureRegisterHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let mgr = this.resolve(ctx, ConfigureManager);
        let config = await mgr.getConfig();
        config = ctx.configuration = Object.assign({}, config, ctx.annoation);
        let regs = ctx.getRaiseContainer().getServices(ConfigureRegister);
        if (regs && regs.length) {
            await Promise.all(regs.map(reg => reg.register(config, ctx)));
            if (config.logConfig && !this.container.has(LogConfigureToken) && !ctx.getRaiseContainer().has(LogConfigureToken)) {
                this.container.bindProvider(LogConfigureToken, config.logConfig);
            }
        }
        await next();
    }
}
