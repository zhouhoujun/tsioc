import { Abstract, Destroyable, Injector, Type, TypeReflect } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption } from './Context';

/**
 * runnable
 */
 @Abstract()
 export abstract class Runnable {
     /**
      * run this service.
      * @param context 
      */
     abstract run(context?: ApplicationContext): any;
 }
 
 /**
  * runner with target ref.
  */
 @Abstract()
 export abstract class Runner<T = any> extends Runnable {
     /**
      * instance of target
      *
      * @readonly
      * @abstract
      * @type {T}
      * @memberof Executor
      */
     abstract get instance(): T;
     /**
      * runnable target ref.
      *
      * @readonly
      * @abstract
      * @type {TargetRef<T>}
      * @memberof Runner
      */
     abstract get targetRef(): TargetRef<T>;
 }
 
 /**
  * target ref.
  */
 @Abstract()
 export abstract class TargetRef<T = any> implements Destroyable {
     /**
      * injector of current target.
      *
      * @readonly
      * @abstract
      * @type {Injector}
      * @memberof TargetRef
      */
     abstract get injector(): Injector;
     /**
      * instance of target
      *
      * @readonly
      * @abstract
      * @type {T}
      * @memberof Executor
      */
     abstract get instance(): T;
     /**
      * target reflect.
      *
      * @readonly
      * @abstract
      * @type {AnnotationReflect<T>}
      * @memberof Executor
      */
     abstract get reflect(): TypeReflect<T>;
     /**
      * execute target type.
      *
      * @readonly
      * @abstract
      * @type {Type<T>}
      * @memberof Executor
      */
     abstract get type(): Type<T>;
     /**
      * Destroys the component instance and all of the data structures associated with it.
      */
     abstract destroy(): void;
     /**
      * A lifecycle hook that provides additional developer-defined cleanup
      * functionality for the component.
      * @param callback A handler function that cleans up developer-defined data
      * associated with this component. Called when the `destroy()` method is invoked.
      */
     abstract onDestroy(callback: () => void): void;
 }
 
 /**
  * boot factory.
  */
 @Abstract()
 export abstract class RunnableFactory<T> {
     /**
      * service type.
      */
     abstract get type(): Type<T>;
     /**
      * create boot context.
      * @param option 
      */
     abstract create(option: BootstrapOption, context?: ApplicationContext): Runnable;
 }
 
 /**
  * runnable factory resolver.
  */
 @Abstract()
 export abstract class RunnableFactoryResolver {
     abstract resolve<T>(type: Type<T>): RunnableFactory<T>;
 }
 
 