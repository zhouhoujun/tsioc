import { BuildHandles } from '../../core';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildContext } from './BuildContext';

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<BuildContext>}
 */
export class ResolveMoudleScope extends BuildHandles<BuildContext> {

    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            return;
        }
        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }

        if (!ctx.targetReflect && ctx.reflects.has(ctx.type)) {
            ctx.targetReflect = ctx.reflects.get(ctx.type);
        }

        if (!ctx.annoation && ctx.targetReflect && ctx.targetReflect.getAnnoation) {
            ctx.annoation = ctx.targetReflect.getAnnoation();
        }

        // has build module instance.
        await super.execute(ctx);
        if (ctx.annoation && next) {
            await next();
        }

    }

    setup() {
        this.use(ResolveModuleHandle)
            .use(DecoratorBuildHandle);
    }
}
