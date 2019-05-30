import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { ModuleDecoratorServiceToken } from '../../core';

export class InitResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.decorator) {
            ctx.decorator = this.container.get(ModuleDecoratorServiceToken).getDecorator(ctx.type);
        }

        if (ctx.decorator) {
            if (!ctx.annoation) {
                ctx.annoation = this.container.get(ModuleDecoratorServiceToken).getAnnoation(ctx.type, ctx.decorator);
            }
            await next();
        }
    }
}
