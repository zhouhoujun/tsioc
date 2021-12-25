import { Abstract, DefaultTypeRef, DispatchHandler, Injector, OperationFactory, Type, TypeRefFactory, InvokeOption, isObject, isFunction } from '@tsdi/ioc';
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
 
 @Abstract()
 export abstract class MiddlewareRefFactory extends TypeRefFactory<Middleware> {
     abstract create(factory: OperationFactory<Middleware>, injector: Injector, option?: InvokeOption): MiddlewareRef;
 }
