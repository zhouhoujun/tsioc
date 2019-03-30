import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@tsdi/ioc';
import { ConfigureManager } from '../annotations';


@Singleton
export class BootConfigureLoadHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.configures && ctx.configures.length) {
            let mgr = ctx.resolve(ConfigureManager);
            ctx.configures.forEach(config => {
                mgr.useConfiguration(config);
            })
            await mgr.getConfig();
        }
        await next();
    }
}
