import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@ts-ioc/ioc';
import { Runnable } from '../runnable';
import { ResolveServiceContext } from '@ts-ioc/core';

@Singleton
export class CreateRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {

        if (ctx.bootstrap instanceof Runnable) {
            ctx.runnable = ctx.bootstrap;
        } else if (ctx.target instanceof Runnable) {
            ctx.runnable = ctx.target;
        } else {
            ctx.runnable = ctx.moduleContainer.getService(Runnable, ctx.bootstrap || ctx.target, ResolveServiceContext.create({ defaultToken: ctx.annoation.defaultRunnable }), { provide: BootContext, useValue: ctx });
        }

        if (ctx.runnable) {
            await next();
        }
    }
}
