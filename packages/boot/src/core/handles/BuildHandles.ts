import { Handle, HandleType, IHandleContext, IHandle } from './Handle';
import { isClass, Singleton, Type } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { Handles } from './Handles';


@Singleton()
export class BuildHandleRegisterer {

    private maps: Map<Type<IHandle<any>>, IHandle<any>>;

    constructor() {
        this.maps = new Map();
    }

    get<T extends Handle<any>>(type: Type<T>): T {
        if (this.maps.has(type)) {
            return this.maps.get(type) as T;
        }
        return null;
    }

    register<T extends IHandleContext>(container: IContainer, HandleType: HandleType<T>, setup?: boolean): this {
        if (!isClass(HandleType)) {
            return this;
        }
        if (this.maps.has(HandleType)) {
            return this;
        }
        let handle = new HandleType(container);
        this.maps.set(HandleType, handle);
        if (setup) {
            if (handle instanceof BuildHandles) {
                handle.setup();
            }
        }
        return this;
    }
}


export abstract class BuildHandle<T extends IHandleContext> extends Handle<T> {
    protected registerHandle(handle: HandleType<T>, setup?: boolean): this {
        this.container.resolve(BuildHandleRegisterer)
            .register(this.container, handle, setup);
        return this;
    }
}

/**
 * composite handles.
 *
 * @export
 * @class CompositeHandle
 * @extends {BuildHandle<T>}
 * @template T
 */
export class BuildHandles<T extends IHandleContext> extends Handles<T> {

    protected registerHandle(HandleType: HandleType<T>, setup?: boolean): this {
        this.container.resolve(BuildHandleRegisterer)
            .register(this.container, HandleType, setup);
        return this;
    }

    protected resolveHanlde(ac: Type<BuildHandle<T>>): BuildHandle<T> {
        return this.container.resolve(BuildHandleRegisterer).get(ac)
    }

    setup() {
    }
}
