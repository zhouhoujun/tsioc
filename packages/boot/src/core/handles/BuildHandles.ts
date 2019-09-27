import { Handle, HandleType, IHandleContext, IHandle } from './Handle';
import { Type, ActionRegisterer, isClass, TypeReflects } from '@tsdi/ioc';
import { Handles } from './Handles';

/**
 * handle registerer.
 *
 * @export
 * @class HandleRegisterer
 * @extends {ActionRegisterer<IHandle>}
 * @template T
 */
export class HandleRegisterer<T extends IHandle = IHandle> extends ActionRegisterer {
    protected setup(handle: T) {
        if (handle instanceof BuildHandles) {
            handle.setup();
        }
    }
}

export interface IBuildContext extends IHandleContext {

    reflects?: TypeReflects;
}

/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IBuildContext = IBuildContext> extends Handle<T> {
    protected registerHandle(handle: HandleType<T>, setup?: boolean): this {
        if (isClass(handle)) {
            this.container.resolve(HandleRegisterer)
                .register(this.container, handle, setup);
        }
        return this;
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
export class BuildHandles<T extends IBuildContext = IBuildContext> extends Handles<T> {

    protected registerHandle(HandleType: HandleType<T>, setup?: boolean): this {
        if (isClass(HandleType)) {
            this.container.resolve(HandleRegisterer)
                .register(this.container, HandleType, setup);
        }
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }
        await super.execute(ctx, next);
    }

    protected resolveHanlde(ac: Type<BuildHandle<T>>): BuildHandle<T> {
        return this.container.resolve(HandleRegisterer).get(ac)
    }

    setup() {
    }
}
