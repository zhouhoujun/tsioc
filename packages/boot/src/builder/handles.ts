import {
    ActionInjectorToken, AsyncHandler, IActionInjector, IActionSetup, Inject, INJECTOR,
    isClass, isNullOrUndefined
} from '@tsdi/ioc';
import { AnnoationContext, BuildContext } from '../Context';
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
export abstract class BuildHandle<T extends AnnoationContext = BuildContext> extends Handle<T> {
    constructor(@Inject(ActionInjectorToken) protected actInjector: IActionInjector) {
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
export class BuildHandles<T extends AnnoationContext = BuildContext> extends Handles<T> {
    constructor(@Inject(ActionInjectorToken) protected actInjector: IActionInjector) {
        super();
    }

    protected toHandle(handleType: HandleType<T>): AsyncHandler<T> {
        return this.actInjector.getAction<AsyncHandler<T>>(handleType);
    }

    protected registerHandle(handleType: HandleType<T>): this {
        if (isClass(handleType)) {
            this.actInjector.regAction(handleType);
        }
        return this;
    }
}



export abstract class ResolveHandle extends BuildHandle<BuildContext> {

}

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<BuildContext>}
 */
export class ResolveMoudleScope extends BuildHandles<BuildContext> implements IActionSetup {

    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value) {
            return;
        }

        if (ctx.type && !ctx.getContainer().isRegistered(ctx.type)) {
            ctx.injector.registerType(ctx.type);
            ctx.setValue(INJECTOR, ctx.getContainer().getInjector(ctx.type))
        }
        if (ctx.type || ctx.template) {
            // has build module instance.
            await super.execute(ctx);
        }

        if (next) {
            await next();
        }

        // after all clean.
        if (isNullOrUndefined(ctx.value)) {
            setTimeout(() => ctx.destroy());
        }
    }

    setup() {
        this.use(ResolveModuleHandle);
    }
}

export const ResolveModuleHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && ctx.type) {
        ctx.value = ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};
