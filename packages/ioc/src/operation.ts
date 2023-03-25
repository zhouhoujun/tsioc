import { ClassType } from './types';
import { InvocationContext } from './context';
import { Observable } from 'rxjs';
import { ReflectiveRef } from './reflective';


/**
 * asyc like
 */
export type AsyncLike<T> = T | Promise<T> | Observable<T>;


/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker<T = any> {
    /**
     * type ref.
     */
    get typeRef(): ReflectiveRef;
    /**
     * invoker order.
     */
    order?: number;
    /**
     * method return type.
     */
    get returnType(): ClassType;
    /**
     * origin method descriptor.
     */
    get descriptor(): TypedPropertyDescriptor<T>;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context: InvocationContext): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param instance instance of the method to invoke.
     */
    invoke(context: InvocationContext, instance: object): T;
    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(): any[];
    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[];
}

/**
 * invoker like.
 */
export type InvokerLike<T = any> = OperationInvoker<T> | ((ctx: InvocationContext) => T);
