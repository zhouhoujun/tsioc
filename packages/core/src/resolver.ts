import { Abstract, Destroyable, DestroyCallback, Injector, InvocationContext, Type, TypeReflect } from '@tsdi/ioc';
import { BootstrapOption } from './Context';


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
    abstract onDestroy(callback: DestroyCallback): void;
}
  
@Abstract()
export abstract class ResolverFactory<T> {
    /**
     * service type.
     */
    abstract get type(): Type<T>;
    /**
     * 
     * @param option 
     */
    abstract create(option: BootstrapOption): TargetRef<T>;
}

/**
  * runnable factory resolver.
  */
 @Abstract()
 export abstract class ResolverFactoryResolver {
     abstract resolve<T>(type: Type<T>): ResolverFactory<T>;
 }
 