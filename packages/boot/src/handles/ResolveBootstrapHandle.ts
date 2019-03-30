import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton, lang } from '@tsdi/ioc';

@Singleton
export class ResolveBootstrapHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            ctx.bootstrap = this.resolve(ctx, ctx.annoation.bootstrap, { provide: BootContext, useValue: ctx }, { provide: lang.getClass(ctx), useValue: ctx });
        }
        await next();
    }
}
