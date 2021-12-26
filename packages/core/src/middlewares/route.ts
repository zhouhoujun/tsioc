import { Abstract, DecorDefine, DefaultTypeRef, DispatchHandler, Injector, InvokeOption, OperationFactory, Type, OperationRefFactory, TypeReflect } from '@tsdi/ioc';
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

@Abstract()
export abstract class RouteRefFactory<T = any> extends OperationRefFactory<T> {
    abstract create(factory: OperationFactory<T>, injector: Injector, option?: InvokeOption): RouteRef<T>;
}
