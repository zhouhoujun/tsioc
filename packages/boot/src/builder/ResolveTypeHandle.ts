import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderService } from '../services';


export class ResolveTypeHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.module && !ctx.target) {
            ctx.target = await this.container.get(BuilderService).resolve(ctx.module, ctx.template || ctx.annoation.template, ctx.getRaiseContainer(), ...(ctx.providers || []));
        }
        await next();
    }
}
