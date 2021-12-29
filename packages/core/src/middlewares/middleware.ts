import { Abstract, Destroyable, DestroyCallback, DispatchHandler, Injector, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';
import { Route, RouteOption } from './route';


/**
 * abstract middleware implements {@link DispatchHandler}.
 *
 * @export
 * @abstract
 * @class Middleware
 */
@Abstract()
export abstract class Middleware<T extends Context = Context> implements DispatchHandler<T, Promise<void>> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract handle(ctx: T, next: () => Promise<void>): Promise<void>;
}

/**
 * middleware ref.
 */
@Abstract()
export abstract class MiddlewareRef<T extends Middleware = Middleware> extends Route implements Destroyable, OnDestroy {
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
    abstract get guards(): Type<CanActive>[] | undefined;
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
