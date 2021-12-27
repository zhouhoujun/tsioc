import { Abstract, DefaultTypeRef, DispatchHandler, Injector, InvokeOption, Type, TypeReflect } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';


/**
 * route instance.
 */
@Abstract()
export abstract class Route<T extends Context = Context> implements DispatchHandler<T, Promise<void>> {
    /**
    * execute middleware.
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
    abstract get guards(): Type<CanActive>[] | undefined;
    /**
     * protocols.
     */
    abstract get protocols(): string[];
}


/**
 * middleware ref.
 */
@Abstract()
export abstract class RouteRef<T = any> extends DefaultTypeRef<T> implements Route {

    abstract handle(ctx: Context, next: () => Promise<void>): Promise<void>;
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
