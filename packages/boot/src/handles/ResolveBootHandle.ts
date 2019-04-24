import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { lang } from '@tsdi/ioc';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            ctx.bootstrap = this.resolve(ctx, ctx.annoation.bootstrap, { provide: BootContext, useValue: ctx }, { provide: lang.getClass(ctx), useValue: ctx });
        }
        await next();
    }
}
