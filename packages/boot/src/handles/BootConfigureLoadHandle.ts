import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Singleton } from '@tsdi/ioc';
import { ConfigureManager } from '../annotations';


@Singleton
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
