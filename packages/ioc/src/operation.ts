import { ClassType } from './types';
import { InvocationContext } from './context';


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
    get returnType(): ClassType<T>;
    /**
     * origin method descriptor.
     */
    get descriptor(): TypedPropertyDescriptor<T>;
    /**
     * method return callback hooks.
     */
    onReturnning(callback: (ctx: InvocationContext, value: T) => void): void;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy try destroy the context after invoked.
     */
    invoke(context: InvocationContext, destroy?: boolean | Function): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param instance instance of the method to invoke.
     * @param destroy try destroy the context after invoked.
     */
    invoke(context: InvocationContext, instance: object, destroy?: boolean | Function): T;
    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[];
}

