import { Singleton, lang, getClassDecorators } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Runnable } from '../runnable';



@Singleton
export class RefDecoratorRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        ctx.runnable = ctx.getRaiseContainer().getService(
            Runnable,
            getClassDecorators(ctx.type),
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx });

        if (!ctx.runnable) {
            next();
        }
    }
}
