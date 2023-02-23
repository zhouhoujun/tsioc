import { ClassType } from './types';
import { InvocationContext } from './context';
import { Observable } from 'rxjs';


/**
 * asyc like
 */
export type AsyncLike<T> = T | Promise<T> | Observable<T>;


/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker<T = any> {
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
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, proceed?: Proceed<T>): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param instance instance of the method to invoke.
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, instance: object, proceed?: Proceed<T>): T;
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

/**
 * invoke proceed.
 */
export type Proceed<T = any> = (ctx: InvocationContext, backend: (ctx: InvocationContext) => T) => T;
