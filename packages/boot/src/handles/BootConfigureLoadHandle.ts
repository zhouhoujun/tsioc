import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { ConfigureManager } from '../annotations';


export class BootConfigureLoadHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.configures && ctx.configures.length) {
            let mgr = this.resolve(ctx, ConfigureManager);
            ctx.configures.forEach(config => {
                mgr.useConfiguration(config);
            })
            await mgr.getConfig();
        }
        await next();
    }
}
