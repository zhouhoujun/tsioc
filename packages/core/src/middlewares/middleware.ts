import { Abstract, DefaultTypeRef, DispatchHandler, Injector, Type, InvokeOption, TypeReflect } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';
import { Route } from './route';


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
export abstract class MiddlewareRef<T extends Middleware = Middleware> extends DefaultTypeRef<T> implements Route {

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
     * @param option invoke option. {@link InvokeOption}.
     * @returns instance of {@link MiddlewareRef}.
     */
    abstract create(injector: Injector, option?: InvokeOption): MiddlewareRef<T>;
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
