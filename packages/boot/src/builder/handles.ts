import { AsyncHandler, IActionSetup, ActionType, Type, refl, TypeReflect, IocAction, Actions } from '@tsdi/ioc';
import { IBuildContext } from '../Context';

/**
 * handle interface.
 *
 * @export
 * @interface IBuildHandle
 * @template T
 */
export interface IBuildHandle<T extends IBuildContext = IBuildContext> extends IocAction<T, AsyncHandler<T>, Promise<void>> {

}

/**
 *  handle type.
 */
export type HandleType<T extends IBuildContext = IBuildContext> = ActionType<IBuildHandle<T>, AsyncHandler<T>>;



/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IBuildContext> extends IocAction<T, AsyncHandler<T>, Promise<void>> implements IBuildHandle<T> {

}

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends IBuildContext = IBuildContext> extends Actions<T, HandleType<T>, AsyncHandler<T>, Promise<void>> {

    protected getActionProvider(ctx: T) {
        return ctx.injector.action();
    }
}

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<IBuildContext>}
 */
export class ResolveScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value) {
            return;
        }
        const regedState = ctx.injector.state();
        if (ctx.type && !regedState.isRegistered(ctx.type)) {
            ctx.injector.register(ctx.type as Type);
            ctx.injector = regedState.getInjector(ctx.type);
        }
        if (!ctx.reflect) {
            (ctx as { reflect: TypeReflect }).reflect = refl.get(ctx.type);
        }
        // has build module instance.
        await super.execute(ctx);

        if (next) {
            await next();
        }
    }

    setup() {
        this.use(ResolveHandle);
    }
}

export const ResolveHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && ctx.type) {
        ctx.value = ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};
