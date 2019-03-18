import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class CreateBootstrapHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            ctx.bootstrap = ctx.resolve(ctx.annoation.bootstrap);
        }
        await next();
    }
}
