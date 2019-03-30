import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton, lang } from '@tsdi/ioc';
import { Runnable } from '../runnable';
import { ResolveServiceContext } from '@tsdi/core';

@Singleton
export class RefRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        ctx.runnable = ctx.getRaiseContainer().getService(
            Runnable,
            ctx.bootstrap || ctx.target,
            ResolveServiceContext.parse({ defaultToken: ctx.annoation.defaultRunnable }),
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx });

        if (!ctx.runnable) {
            next();
        }
    }
}
