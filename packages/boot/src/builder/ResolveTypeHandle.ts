import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderService } from '../services';


export class ResolveTypeHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.module && !ctx.target) {
            let container = ctx.getRaiseContainer();
            ctx.target = await container.resolve(BuilderService).resolve(ctx.module, ctx.template, container, ...(ctx.providers || []));
        }
        await next();
    }
}
