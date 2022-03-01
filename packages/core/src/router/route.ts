import { Abstract, Destroyable, DestroyCallback, DispatchHandler, Injector, InvokeOption, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { TransportContext } from '../transport/context';
import { CanActivate } from '../transport/guard';


/**
 * route instance.
 */
@Abstract()
export abstract class Route<T extends TransportContext = TransportContext> implements DispatchHandler<T, Promise<void>> {
    /**
    * route handle.
    *
    * @abstract
    * @param {T} ctx
    * @param {() => Promise<void>} next
    * @returns {Promise<void>}
    */
    abstract handle(ctx: T, next: () => Promise<void>): Promise<void>;
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
}


/**
 * middleware ref.
 */
@Abstract()
export abstract class RouteRef<T = any> extends Route implements Destroyable, OnDestroy {
    /**
     * controller type.
     */
    abstract get type(): Type<T>;
    /**
     * controller type reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * controller injector. the controller registered in.
     */
    abstract get injector(): Injector;
    /**
     * controller instance.
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
 * route option.
 */
export interface RouteOption extends InvokeOption {
    /**
     * route prefix.
     */
    prefix?: string;
}

/**
 * routeRef factory.
 */
@Abstract()
export abstract class RouteRefFactory<T = any> {
    /**
     * route reflect.
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * create {@link RouteRef}
     * @param injector injector.
     * @param option invoke option. type of {@link RouteOption}.
     * @returns instance of {@link RouteRef}
     */
    abstract create(injector: Injector, option?: RouteOption): RouteRef<T>;
}

/**
 * routeRef factory resovler.
 */
@Abstract()
export abstract class RouteRefFactoryResolver {
    /**
     * resolve {@link RouteRefFactory}
     * @param type route class type.
     * @returns instance of {@link RouteRefFactory}.
     */
    abstract resolve<T>(type: Type<T> | TypeReflect<T>): RouteRefFactory<T>;
}


const endExp = /\/$/;

export function joinprefix(...paths: (string | undefined)[]) {
    let joined = paths.filter(p => p)
        .map(p => p && endExp.test(p) ? p.slice(0, p.length - 1) : p)
        .join('/');

    return endExp.test(joined) ? joined : joined + '/';
}
