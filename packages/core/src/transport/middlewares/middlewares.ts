import { Abstract, AsyncHandler, chain, Destroyable, DestroyCallback, Injector, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { TransportContext } from '../context';
import { CanActivate } from '../guard';
import { Middleware } from './middleware';
import { Route, RouteOption } from './route';


/**
 * message type for register in {@link Middlewares}.
 */
export type MiddlewareType = AsyncHandler<TransportContext> | Middleware | Route;


/**
 * middlewares, compose of {@link Middleware}.
 */
export class Middlewares<T extends TransportContext = TransportContext> extends Middleware<T> {
    protected handles: MiddlewareType[] = [];
    /**
     * use handle.
     *
     * @param {MiddlewareType} handle
     * @returns {this}
     */
    use(...handles: MiddlewareType[]): this {
        handles.forEach(handle => {
            if (this.has(handle)) return;
            this.handles.push(handle);
        });
        return this;
    }

    unuse(...handles: (MiddlewareType | Type)[]) {
        handles.forEach(handle => {
            this.remove(this.handles, handle);
        });
        return this;
    }

    /**
     * use handle before
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} before
     * @returns {this}
     */
    useBefore(handle: MiddlewareType, before: MiddlewareType | Type): this {
        if (this.has(handle)) {
            return this;
        }
        if (before) {
            this.handles.splice(this.handles.findIndex(h => this.equals(h, before)), 0, handle);
        } else {
            this.handles.unshift(handle);
        }
        return this;
    }
    /**
     * use handle after.
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} after
     * @returns {this}
     */
    useAfter(handle: MiddlewareType, after?: MiddlewareType | Type): this {
        if (this.has(handle)) {
            return this;
        }
        if (after) {
            this.handles.splice(this.handles.findIndex(h => this.equals(h, after)) + 1, 0, handle);
        } else {
            this.handles.push(handle);
        }
        return this;
    }

    protected remove(target: MiddlewareType[], handle: MiddlewareType | Type): void {
        const idx = target.findIndex(h => this.equals(h, handle));
        if (idx >= 0) {
            target.splice(idx, 1);
        }
    }

    has(handle: MiddlewareType | Type): boolean {
        return this.handles.some(h => this.equals(h, handle));
    }

    override handle(ctx: T, next?: () => Promise<void>): Promise<void> {
        return chain(this.handles, ctx, next);
    }

    protected equals(hd: MiddlewareType, hd2: MiddlewareType | Type) {
        if (hd === hd2) return true;
        if (hd instanceof MiddlewareRef) {
            return hd2 instanceof MiddlewareRef ? hd.type === hd2.type : hd.type === hd2;
        }
        return false;
    }
}



/**
 * middleware ref.
 */
@Abstract()
export abstract class MiddlewareRef<T extends Middleware = Middleware> extends Middlewares implements Destroyable, OnDestroy {
    /**
     * middleware type.
     */
    abstract get type(): Type<T>;
    /**
     * middleware type reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * middleware injector. the middleware registered in.
     */
    abstract get injector(): Injector;
    /**
     * middleware instance.
     */
    abstract get instance(): T;
    /**
     * route url.
     */
    abstract get url(): string;
    /**
     * route guards.
     */
    abstract get guards(): Type<CanActivate>[] | undefined;
    /**
     * protocols.
     */
    abstract get protocols(): string[];

    /**
     * is destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    abstract onDestroy(callback?: DestroyCallback): void | Promise<void>;

}


/**
 * middleware ref factory.
 */
@Abstract()
export abstract class MiddlewareRefFactory<T extends Middleware> {
    /**
     * middleware reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * create {@link MiddlewareRef}.
     * @param injector injector.
     * @param option invoke option. {@link RouteOption}.
     * @returns instance of {@link MiddlewareRef}.
     */
    abstract create(injector: Injector, option?: RouteOption): MiddlewareRef<T>;
}

@Abstract()
export abstract class MiddlewareRefFactoryResolver {
    /**
     * resolve middleware ref factory. instance of {@link MiddlewareRefFactory}.
     * @param type
     * @returns instance of {@link MiddlewareRefFactory}.
     */
    abstract resolve<T extends Middleware>(type: Type<T> | TypeReflect<T>): MiddlewareRefFactory<T>;
}

