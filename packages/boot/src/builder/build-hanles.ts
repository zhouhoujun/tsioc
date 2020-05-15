import { IActionSetup, INJECTOR, isNullOrUndefined, lang } from '@tsdi/ioc';
import { IBuildContext } from './IBuildContext';
import { BuildHandle, BuildHandles } from './BuildHandles';
import { IAnnoationReflect } from '../annotations/IAnnoationReflect';

export abstract class ResolveHandle extends BuildHandle<IBuildContext> {

}

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<BuildContext>}
 */
export class ResolveMoudleScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value) {
            return;
        }

        let targetReflect: IAnnoationReflect;
        if (ctx.type && !ctx.reflects.hasRegister(ctx.type)) {
            ctx.injector.registerType(ctx.type);
            targetReflect = ctx.getTargetReflect();
            targetReflect && ctx.setValue(INJECTOR, targetReflect.getInjector())
        } else {
            targetReflect = ctx.getTargetReflect();
        }

        if (targetReflect || ctx.getTemplate()) {
            // has build module instance.
            await super.execute(ctx);
        }

        if (next) {
            await next();
        }

        // after all clean.
        if (isNullOrUndefined(ctx.value)) {
            ctx.destroy();
        }
    }

    setup() {
        this.use(ResolveModuleHandle);
    }
}

export const ResolveModuleHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && ctx.type) {
        ctx.value = ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};
