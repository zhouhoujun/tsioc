import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@tsdi/ioc';

@Singleton
export class BootProvidersHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.providers && ctx.providers.length) {
            let container = ctx.getRaiseContainer();
            container.bindProviders(...ctx.providers);
        }
        await next();
    }
}
