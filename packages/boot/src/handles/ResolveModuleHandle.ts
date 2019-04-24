import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';


export class ResolveModuleHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.target) {
            ctx.target = this.resolve(ctx, ctx.module, ...ctx.providers || []);
        }
        if (ctx.target) {
            await next();
        }
    }
}
