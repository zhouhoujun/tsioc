import { lang } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Startup, Runnable, Service, Renderer } from '../runnable';


export class RefRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        ctx.runnable = ctx.getContainer().getService(
            { tokens: [Startup, Renderer, Runnable, Service], target: [ctx.getBootTarget(), ctx.targetReflect ? ctx.targetReflect.decorator : ctx.decorator], defaultToken: ctx.annoation ? ctx.annoation.defaultRunnable : undefined },
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx });

        if (!ctx.runnable) {
            await next();
        }
    }
}
