import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { lang } from '@tsdi/ioc';
import { Runnable } from '../runnable';


export class RefRunnableHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        ctx.runnable = ctx.getRaiseContainer().getService(
            { token: Runnable, target: ctx.getBootTarget(), defaultToken: ctx.annoation.defaultRunnable },
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx });

        if (!ctx.runnable) {
            next();
        }
    }
}
