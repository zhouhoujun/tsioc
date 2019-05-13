import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { ModuleDecoratorService } from '../../services';

export class InitResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.decorator) {
            ctx.decorator = this.container.get(ModuleDecoratorService).getDecorator(ctx.type);
        }

        if (ctx.decorator) {
            if (!ctx.annoation) {
                ctx.annoation = this.container.get(ModuleDecoratorService).getAnnoation(ctx.type, ctx.decorator);
            }
            await next();
        }
    }
}
