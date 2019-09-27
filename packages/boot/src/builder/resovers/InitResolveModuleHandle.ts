import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { AnnotationServiceToken } from '../../core';

export class InitResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }

        if (!ctx.targetReflect) {
            let reflect = ctx.reflects.get(ctx.type);
            if (reflect) {
                ctx.targetReflect = reflect;
            }
        }

        if (ctx.targetReflect) {
            if (!ctx.annoation) {
                ctx.annoation = ctx.targetReflect.getAnnoation ? ctx.targetReflect.getAnnoation() : this.container.get(AnnotationServiceToken).getAnnoation(ctx.type, ctx.targetReflect.decorator);
            }
            await next();
        }
    }
}
