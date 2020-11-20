import { AsyncHandler, IActionSetup, isClass, Inject, INJECTOR } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IAnnoationContext, IBuildContext } from '../Context';
import { Handle, HandleType } from '../handles/Handle';
import { Handles } from '../handles/Handles';



/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IAnnoationContext = IBuildContext> extends Handle<T> {
    constructor(@Inject(INJECTOR) protected readonly injector: ICoreInjector) {
        super();
    }
}

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends IAnnoationContext = IBuildContext> extends Handles<T> {

    constructor(@Inject(INJECTOR) protected readonly injector: ICoreInjector) {
        super();
    }

    protected toHandle(handleType: HandleType<T>): AsyncHandler<T> {
        return this.injector.getContainer().provider.getAction<AsyncHandler<T>>(handleType);
    }

    protected regHandle(handle: HandleType<T>): this {
        isClass(handle) && this.injector.getContainer().provider.regAction(handle);
        return this;
    }
}

/**
 * resolve handle.
 */
export abstract class ResolveHandle extends BuildHandle<IBuildContext> { }

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<IBuildContext>}
 */
export class ResolveMoudleScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value) {
            return;
        }
        const container = ctx.getContainer();
        if (ctx.type && !container.regedState.isRegistered(ctx.type)) {
            ctx.injector.registerType(ctx.type);
            ctx.setValue(INJECTOR, container.regedState.getInjector(ctx.type))
        }
        // has build module instance.
        await super.execute(ctx);

        if (next) {
            await next();
        }
        // after all clean.
        setTimeout(() => ctx.destroy());
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
