import { isClass, Type, Singleton } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { Handle, IHandleContext, HandleType } from './Handle';
import { CompositeHandle } from './CompositeHandle';

@Singleton()
export class HandleRegisterer {

    private maps: Map<Type<Handle<any>>, Handle<any>>;

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
            if (handle instanceof CompositeHandle) {
                handle.setup();
            }
        }
        return this;
    }
}
