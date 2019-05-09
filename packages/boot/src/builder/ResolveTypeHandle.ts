import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderService } from '../services';


export class ResolveTypeHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.module && !ctx.target) {
            ctx.target = await this.container.get(BuilderService).resolve(ctx.module, {
                template: ctx.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator,
                providers: ctx.providers
            });
        }
        await next();
    }
}
