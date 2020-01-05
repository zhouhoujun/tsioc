import { lang } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Startup } from '../runnable/Startup';
import { Renderer } from '../runnable/Renderer';
import { Runnable } from '../runnable/Runnable';
import { Service } from '../runnable/Service';


export class RefRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        ctx.runnable = ctx.getContainer().getService(
            { tokens: [Startup, Renderer, Runnable, Service], target: [ctx.getBootTarget(), ctx.targetReflect ? ctx.targetReflect.decorator : ctx.decorator] },
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx });

        if (!ctx.runnable) {
            await next();
        }
    }
}
