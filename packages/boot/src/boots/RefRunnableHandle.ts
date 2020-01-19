import { lang } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { Startup } from '../runnable/Startup';
import { Renderer } from '../runnable/Renderer';
import { Runnable } from '../runnable/Runnable';
import { Service } from '../runnable/Service';
import { CTX_MODULE_STARTUP } from '../context-tokens';


export const RefRunnableHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.injector.getService(
        { tokens: [Startup, Renderer, Runnable, Service], target: ctx.boot },
        { provide: BootContext, useValue: ctx },
        { provide: lang.getClass(ctx), useValue: ctx });

    startup && ctx.setValue(CTX_MODULE_STARTUP, startup);

    if (!ctx.hasValue(CTX_MODULE_STARTUP)) {
        await next();
    }
};
