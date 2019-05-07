import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderService } from '../services';
import { isClass } from '@tsdi/ioc';
import { RegScope } from '../core';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            let bootModule = ctx.annoation.bootstrap;
            let container = ctx.getRaiseContainer();
            if (isClass(bootModule)) {
                ctx.bootstrap = await container.get(BuilderService).create({ regScope: RegScope.boot, module: bootModule, template: ctx.template, providers: ctx.providers }, ...ctx.args)// this.resolve(ctx, ctx.annoation.bootstrap, ...[...providers, { provide: BootContext, useValue: ctx }, { provide: lang.getClass(ctx), useValue: ctx }]);
            } else {
                ctx.bootstrap = container.resolve(bootModule, ...ctx.providers);
            }
        }

        ctx.currTarget = ctx.bootstrap;
        await next();

    }
}
