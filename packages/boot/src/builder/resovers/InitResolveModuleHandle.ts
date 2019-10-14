import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';

export class InitResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }

        if (!ctx.targetReflect && ctx.reflects.has(ctx.type)) {
            ctx.targetReflect = ctx.reflects.get(ctx.type);
        }

        if (!ctx.annoation && ctx.targetReflect && ctx.targetReflect.getAnnoation) {
            ctx.annoation = ctx.targetReflect.getAnnoation();
        }

        if (ctx.annoation) {
            await next();
        } else {
            ctx.target = this.resolve(ctx, ctx.type, ...(ctx.providers || []))
        }
    }
}
