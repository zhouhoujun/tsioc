import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { isClass } from '@tsdi/ioc';
import { BuilderService } from '../services';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            let bootModule = ctx.annoation.bootstrap;
            let container = ctx.getRaiseContainer();
            if (isClass(bootModule)) {
                ctx.bootstrap = await container.resolve(BuilderService).resolve(bootModule, ctx.template, container, ...(ctx.providers || []));
            } else {
                ctx.bootstrap = container.resolve(bootModule, ...ctx.providers);
            }
        }
        await next();

    }
}
