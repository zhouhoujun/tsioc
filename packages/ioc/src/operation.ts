import { ClassType } from './types';
import { AfterHook, BeforeHook, AfterReturnningHook, InvocationContext, FinallyHook } from './context';


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
     * before invoke.
     * @param hook 
     */
    before(hook: BeforeHook): void;
    /**
     * after invoke.
     * @param hook 
     */
    after(hook: AfterHook): void;
    /**
     * after returning hooks.
     */
    afterReturnning(hook: AfterReturnningHook): void;
    /**
     * after throwing hooks.
     */
    afterThrowing(hook: AfterReturnningHook): void;
    /**
     * finally hooks.
     */
    finally(hook: FinallyHook): void;
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

