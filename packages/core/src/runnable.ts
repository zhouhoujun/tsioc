import { Abstract, Destroyable, Injector, InvocationContext, InvokeArguments, OperationInvokerFactory, Type, TypeReflect } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption } from './Context';

/**
 * runnable
 */
@Abstract()
export abstract class Runnable {
    /**
     * run this service.
     */
    abstract run(): any;
}


/**
 * target ref.
 */
@Abstract()
export abstract class TargetRef<T = any> implements Destroyable {
    
    abstract get injector(): Injector;
    /**
     * target invoker factory.
     */
    abstract get invokerFactory(): OperationInvokerFactory<T>;
    /**
     * invocation context of current target.
     *
     * @readonly
     * @abstract
     * @type {Injector}
     */
    abstract get context(): InvocationContext;
    /**
     * instance of target
     *
     * @readonly
     * @abstract
     * @type {T}
     */
    abstract get instance(): T;
    /**
     * target reflect.
     *
     * @readonly
     * @abstract
     */
    abstract get reflect(): TypeReflect<T>;
    /**
     * execute target type.
     *
     * @readonly
     * @abstract
     * @type {Type<T>}
     */
    abstract get type(): Type<T>;

    /**
     * invoke target method.
     * @param method 
     * @param option 
     */
    abstract invoke(method: string, option?: InvokeArguments): any;

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
