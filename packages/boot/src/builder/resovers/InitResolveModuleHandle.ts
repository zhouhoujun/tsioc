import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { ModuleDecoratorServiceToken } from '../../core';

export class InitResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let service = this.container.get(ModuleDecoratorServiceToken);
        if (!ctx.decorator) {
            ctx.decorator = service.getDecorator(ctx.type);
        }

        if (ctx.decorator) {
            if (!ctx.annoation) {
                ctx.annoation = service.getAnnoation(ctx.type, ctx.decorator);
            }
            await next();
        }
    }
}
