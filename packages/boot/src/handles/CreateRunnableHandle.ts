import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@ts-ioc/ioc';
import { Runnable } from '../runnable';

@Singleton
export class CreateRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.bootstrap) {
            if (ctx.bootstrap instanceof Runnable) {
                ctx.runnable = ctx.runnable;
            } else {
                ctx.runnable = ctx.moduleContainer.getService(ctx.annoation.bootstrap, { provide: BootContext, useValue: ctx });
            }

            await next();
        }
    }
}
