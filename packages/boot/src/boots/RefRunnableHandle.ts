import { lang } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { Startup } from '../runnable/Startup';
import { Renderer } from '../runnable/Renderer';
import { Runnable } from '../runnable/Runnable';
import { Service } from '../runnable/Service';


export const RefRunnableHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    ctx.runnable = ctx.injector.getService(
        { tokens: [Startup, Renderer, Runnable, Service], target: ctx.getBootTarget() },
        { provide: BootContext, useValue: ctx },
        { provide: lang.getClass(ctx), useValue: ctx });

    if (!ctx.runnable) {
        await next();
    }
};
