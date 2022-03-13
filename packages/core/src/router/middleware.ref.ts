import { Abstract, Destroyable, DestroyCallback, Injector, OnDestroy, Type, TypeReflect } from '@tsdi/ioc';
import { TransportContext } from '../transport/context';
import { CanActivate } from '../transport/guard';
import { Middlewarable } from '../transport/middleware';
import { RouteOption } from './route';


/**
 * middleware ref.
 */
 @Abstract()
 export abstract class MiddlewareRef<T extends Middlewarable = Middlewarable> implements Middlewarable, Destroyable, OnDestroy {
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
      * 
      * @param ctx 
      * @param next 
      */
     abstract handle(ctx: TransportContext, next: () => Promise<void>): Promise<void>;
 
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
 export abstract class MiddlewareRefFactory<T extends Middlewarable> {
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
     abstract resolve<T extends Middlewarable>(type: Type<T> | TypeReflect<T>): MiddlewareRefFactory<T>;
 }
 